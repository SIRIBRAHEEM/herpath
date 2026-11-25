// HerPath core logic.
// Everything in this file is a pure function: no DOM, no storage, no dates
// read from the clock unless a caller passes "today" in. That keeps the
// maths easy to test and honest to reason about.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days from `today` until `deadline`. Negative when the deadline has
// passed. Both arguments are ISO date strings (YYYY-MM-DD) or Date objects.
export function daysUntil(deadline, today) {
  const end = startOfDay(deadline);
  const start = startOfDay(today);
  if (end === null || start === null) return null;
  return Math.round((end - start) / MS_PER_DAY);
}

function startOfDay(value) {
  if (value instanceof Date) {
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

// How urgent a deadline feels, for badges and colours.
export function urgencyFor(days) {
  if (days === null || days === undefined) return 'open';
  if (days < 0) return 'closed';
  if (days <= 14) return 'urgent';
  if (days <= 45) return 'soon';
  return 'open';
}

export function deadlineLabel(days) {
  if (days === null || days === undefined) return 'No deadline listed';
  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `Closes in ${days} days`;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!match) return 'Date to be announced';
  const month = MONTHS[Number(match[2]) - 1];
  return `${Number(match[3])} ${month} ${match[1]}`;
}

// Does one opportunity match a free-text search? Looks at the name,
// organisation, description and field tags.
export function matchesQuery(opp, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    opp.name,
    opp.org,
    opp.description,
    opp.type,
    ...(opp.fields || []),
    ...(opp.regions || []),
  ]
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

// Filter the catalogue. A filter value of 'all' (or empty) means "no filter".
export function filterOpportunities(list, filters = {}) {
  const { query = '', type = 'all', level = 'all', region = 'all', field = 'all' } = filters;
  return list.filter((opp) => {
    if (!matchesQuery(opp, query)) return false;
    if (type !== 'all' && opp.type !== type) return false;
    if (level !== 'all' && !opp.levels.includes(level) && !opp.levels.includes('any')) return false;
    if (region !== 'all' && !opp.regions.includes(region) && !opp.regions.includes('Global')) return false;
    if (field !== 'all' && !opp.fields.includes(field) && !opp.fields.includes('any')) return false;
    return true;
  });
}

// Sort modes: 'deadline' (soonest first, closed last), 'name', 'newest'
// (latest deadline first is not newest, so newest uses the `added` order
// stored on each item: higher `added` number means listed more recently).
export function sortOpportunities(list, mode = 'deadline', today) {
  const copy = [...list];
  if (mode === 'name') {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === 'newest') {
    return copy.sort((a, b) => (b.added || 0) - (a.added || 0));
  }
  return copy.sort((a, b) => {
    const da = daysUntil(a.deadline, today);
    const db = daysUntil(b.deadline, today);
    const aClosed = da !== null && da < 0;
    const bClosed = db !== null && db < 0;
    if (aClosed !== bClosed) return aClosed ? 1 : -1;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

// Score how well one opportunity fits a profile.
// profile: { level, field, region, interests: [] }
// Returns { score: 0..100, reasons: [string] }.
export function scoreMatch(opp, profile = {}) {
  const reasons = [];
  let points = 0;
  let possible = 0;

  // Education level: worth 30 points.
  possible += 30;
  if (profile.level && profile.level !== 'any') {
    if (opp.levels.includes(profile.level)) {
      points += 30;
      reasons.push(`Open to ${labelForLevel(profile.level)} students like you`);
    } else if (opp.levels.includes('any')) {
      points += 22;
      reasons.push('Open to every education level');
    }
  } else {
    points += 15;
  }

  // Region: worth 25 points. A Nigeria-only listing beats a global one for
  // a Nigerian applicant because fewer people compete for it.
  possible += 25;
  if (profile.region && profile.region !== 'any') {
    if (opp.regions.includes(profile.region)) {
      points += 25;
      reasons.push(`Made for applicants in ${profile.region}`);
    } else if (opp.regions.includes('Global')) {
      points += 18;
      reasons.push('Open to applicants worldwide');
    }
  } else {
    points += 12;
  }

  // Field of study: worth 25 points.
  possible += 25;
  if (profile.field && profile.field !== 'any') {
    if (opp.fields.includes(profile.field)) {
      points += 25;
      reasons.push(`Fits your ${profile.field} path`);
    } else if (opp.fields.includes('any')) {
      points += 16;
      reasons.push('Welcomes every field of study');
    }
  } else {
    points += 12;
  }

  // Interests (opportunity types she picked): worth 20 points.
  possible += 20;
  const interests = profile.interests || [];
  if (interests.length > 0) {
    if (interests.includes(opp.type)) {
      points += 20;
      reasons.push(`It is a ${opp.type.toLowerCase()}, which you asked for`);
    }
  } else {
    points += 10;
  }

  const score = possible === 0 ? 0 : Math.round((points / possible) * 100);
  return { score, reasons };
}

// Rank the whole catalogue for a profile, best match first. Ties break by
// sooner deadline, so urgent good matches surface early.
export function rankMatches(list, profile, today) {
  return list
    .map((opp) => ({ opp, ...scoreMatch(opp, profile) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = daysUntil(a.opp.deadline, today);
      const db = daysUntil(b.opp.deadline, today);
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    });
}

// Progress through an application checklist.
// items: [{ id, label, done }]
export function checklistProgress(items = []) {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, percent };
}

// Build a fresh checklist for an opportunity from its document list.
export function buildChecklist(documents = []) {
  return documents.map((label, index) => ({
    id: `doc-${index}`,
    label,
    done: false,
  }));
}

// Keep a saved checklist in sync when the catalogue wording changes:
// keep the done flags, follow the current document list.
export function mergeChecklist(documents = [], saved = []) {
  const savedByLabel = new Map(saved.map((item) => [item.label, item.done]));
  return documents.map((label, index) => ({
    id: `doc-${index}`,
    label,
    done: savedByLabel.get(label) === true,
  }));
}

export function labelForLevel(level) {
  const labels = {
    secondary: 'secondary school',
    undergraduate: 'undergraduate',
    postgraduate: 'postgraduate',
    any: 'every level',
  };
  return labels[level] || level;
}

// Count of opportunities closing within the next `windowDays` days.
export function closingSoonCount(list, today, windowDays = 30) {
  return list.filter((opp) => {
    const days = daysUntil(opp.deadline, today);
    return days !== null && days >= 0 && days <= windowDays;
  }).length;
}
