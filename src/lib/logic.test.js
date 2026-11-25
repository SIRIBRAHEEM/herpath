// Unit tests for HerPath core logic. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysUntil,
  urgencyFor,
  deadlineLabel,
  formatDate,
  matchesQuery,
  filterOpportunities,
  sortOpportunities,
  scoreMatch,
  rankMatches,
  checklistProgress,
  buildChecklist,
  mergeChecklist,
  closingSoonCount,
} from './logic.js';
import { OPPORTUNITIES } from '../data/opportunities.js';

const TODAY = '2026-12-01';

test('daysUntil counts whole days and handles past deadlines', () => {
  assert.equal(daysUntil('2026-12-15', TODAY), 14);
  assert.equal(daysUntil('2026-12-01', TODAY), 0);
  assert.equal(daysUntil('2026-11-30', TODAY), -1);
  assert.equal(daysUntil('not-a-date', TODAY), null);
});

test('urgencyFor bands deadlines correctly', () => {
  assert.equal(urgencyFor(-3), 'closed');
  assert.equal(urgencyFor(0), 'urgent');
  assert.equal(urgencyFor(14), 'urgent');
  assert.equal(urgencyFor(15), 'soon');
  assert.equal(urgencyFor(45), 'soon');
  assert.equal(urgencyFor(46), 'open');
  assert.equal(urgencyFor(null), 'open');
});

test('deadlineLabel reads naturally', () => {
  assert.equal(deadlineLabel(0), 'Closes today');
  assert.equal(deadlineLabel(1), 'Closes tomorrow');
  assert.equal(deadlineLabel(9), 'Closes in 9 days');
  assert.equal(deadlineLabel(-2), 'Closed');
  assert.equal(deadlineLabel(null), 'No deadline listed');
});

test('formatDate prints a friendly date', () => {
  assert.equal(formatDate('2027-02-15'), '15 Feb 2027');
  assert.equal(formatDate('2027-12-03'), '3 Dec 2027');
  assert.equal(formatDate(''), 'Date to be announced');
});

test('matchesQuery searches name, org and tags, all words required', () => {
  const opp = OPPORTUNITIES.find((o) => o.id === 'she-code-africa');
  assert.equal(matchesQuery(opp, 'she code'), true);
  assert.equal(matchesQuery(opp, 'mentor'), true);
  assert.equal(matchesQuery(opp, 'she banana'), false);
  assert.equal(matchesQuery(opp, ''), true);
});

test('filterOpportunities applies type, level, region and field', () => {
  const scholarships = filterOpportunities(OPPORTUNITIES, { type: 'Scholarship' });
  assert.ok(scholarships.length >= 5);
  assert.ok(scholarships.every((o) => o.type === 'Scholarship'));

  const nigeria = filterOpportunities(OPPORTUNITIES, { region: 'Nigeria' });
  assert.ok(nigeria.some((o) => o.id === 'mtn-scholarship'));
  assert.ok(nigeria.every((o) => o.regions.includes('Nigeria') || o.regions.includes('Global')));

  const secondary = filterOpportunities(OPPORTUNITIES, { level: 'secondary' });
  assert.ok(secondary.some((o) => o.id === 'rise-challenge'));
  assert.ok(!secondary.some((o) => o.id === 'faculty-for-future'));

  const none = filterOpportunities(OPPORTUNITIES, { query: 'zzzznope' });
  assert.equal(none.length, 0);
});

test('sortOpportunities puts soonest deadline first and closed last', () => {
  const list = [
    { name: 'Later', deadline: '2027-05-01' },
    { name: 'Closed', deadline: '2026-01-01' },
    { name: 'Soon', deadline: '2026-12-10' },
  ];
  const sorted = sortOpportunities(list, 'deadline', TODAY);
  assert.deepEqual(sorted.map((o) => o.name), ['Soon', 'Later', 'Closed']);
  const byName = sortOpportunities(list, 'name', TODAY);
  assert.deepEqual(byName.map((o) => o.name), ['Closed', 'Later', 'Soon']);
});

test('scoreMatch rewards a full fit and explains why', () => {
  const opp = OPPORTUNITIES.find((o) => o.id === 'mtn-scholarship');
  const profile = {
    level: 'undergraduate',
    field: 'STEM',
    region: 'Nigeria',
    interests: ['Scholarship'],
  };
  const { score, reasons } = scoreMatch(opp, profile);
  assert.equal(score, 100);
  assert.ok(reasons.length >= 3);
  assert.ok(reasons.some((r) => r.includes('Nigeria')));
});

test('scoreMatch gives partial credit for global and any-field listings', () => {
  const opp = OPPORTUNITIES.find((o) => o.id === 'generation-google');
  const profile = {
    level: 'undergraduate',
    field: 'STEM',
    region: 'Nigeria',
    interests: ['Internship'],
  };
  const { score, reasons } = scoreMatch(opp, profile);
  // level 30 + region 18 (global) + field 25 + interest 0 = 73
  assert.equal(score, 73);
  assert.ok(reasons.some((r) => r.includes('worldwide')));
});

test('scoreMatch with an empty profile stays neutral', () => {
  const opp = OPPORTUNITIES[0];
  const { score } = scoreMatch(opp, {});
  assert.ok(score >= 40 && score <= 60);
});

test('rankMatches sorts by score then deadline', () => {
  const profile = {
    level: 'secondary',
    field: 'STEM',
    region: 'Africa',
    interests: ['Bootcamp'],
  };
  const ranked = rankMatches(OPPORTUNITIES, profile, TODAY);
  assert.equal(ranked[0].opp.id, 'african-girls-can-code');
  for (let i = 1; i < ranked.length; i += 1) {
    assert.ok(ranked[i - 1].score >= ranked[i].score);
  }
});

test('checklistProgress counts done items', () => {
  const items = buildChecklist(['Transcript', 'Statement', 'Photo']);
  assert.equal(items.length, 3);
  assert.deepEqual(checklistProgress(items), { done: 0, total: 3, percent: 0 });
  items[0].done = true;
  items[1].done = true;
  assert.deepEqual(checklistProgress(items), { done: 2, total: 3, percent: 67 });
  assert.deepEqual(checklistProgress([]), { done: 0, total: 0, percent: 0 });
});

test('mergeChecklist keeps done flags when wording changes', () => {
  const saved = [
    { id: 'doc-0', label: 'Transcript', done: true },
    { id: 'doc-1', label: 'Old document', done: true },
  ];
  const merged = mergeChecklist(['Transcript', 'New document'], saved);
  assert.equal(merged[0].done, true);
  assert.equal(merged[1].done, false);
});

test('closingSoonCount counts deadlines inside the window', () => {
  const list = [
    { deadline: '2026-12-20' },
    { deadline: '2027-06-01' },
    { deadline: '2026-11-01' },
  ];
  assert.equal(closingSoonCount(list, TODAY, 30), 1);
  assert.equal(closingSoonCount(list, TODAY, 200), 2);
});

test('the catalogue is well formed', () => {
  assert.ok(OPPORTUNITIES.length >= 15);
  const ids = new Set();
  for (const opp of OPPORTUNITIES) {
    assert.ok(opp.id && !ids.has(opp.id), `duplicate or missing id: ${opp.id}`);
    ids.add(opp.id);
    assert.ok(opp.name && opp.org && opp.type);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(opp.deadline));
    assert.ok(opp.documents.length >= 1);
    assert.ok(opp.howToApply.length >= 2);
  }
});
