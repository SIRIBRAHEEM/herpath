import { useEffect, useMemo, useState } from 'react';
import {
  daysUntil,
  urgencyFor,
  deadlineLabel,
  formatDate,
  filterOpportunities,
  sortOpportunities,
  rankMatches,
  checklistProgress,
  buildChecklist,
  mergeChecklist,
  closingSoonCount,
  labelForLevel,
} from './lib/logic.js';
import { OPPORTUNITIES, TYPES, LEVELS, REGIONS, FIELDS } from './data/opportunities.js';

const STORAGE_KEY = 'herpath-v1';
const TODAY = new Date();

const TYPE_CLASS = {
  Scholarship: 'type-scholarship',
  Internship: 'type-internship',
  Mentorship: 'type-mentorship',
  Bootcamp: 'type-bootcamp',
  Fellowship: 'type-fellowship',
  Competition: 'type-competition',
};

const FIELD_LABELS = {
  STEM: 'STEM',
  health: 'Health',
  business: 'Business',
  arts: 'Arts',
  any: 'All fields',
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { saved: [], checklists: {}, profile: null };
    const parsed = JSON.parse(raw);
    return {
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      checklists: parsed.checklists && typeof parsed.checklists === 'object' ? parsed.checklists : {},
      profile: parsed.profile || null,
    };
  } catch {
    return { saved: [], checklists: {}, profile: null };
  }
}

function LogoMark() {
  return (
    <svg className="size-11 shrink-0" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#5E2B4F" />
      <text
        x="32"
        y="45"
        textAnchor="middle"
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="800"
        fontSize="36"
        fill="#FDF6F8"
      >
        H
      </text>
      <circle cx="50" cy="14" r="4.5" fill="#D1658F" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function IconBookmark({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h15M13 5l7 7-7 7" />
    </svg>
  );
}

function DeadlineBadge({ deadline }) {
  const days = daysUntil(deadline, TODAY);
  const urgency = urgencyFor(days);
  return (
    <span className={`deadline-badge urgency-${urgency}`}>
      <IconCalendar />
      {deadlineLabel(days)} ({formatDate(deadline)})
    </span>
  );
}

function OpportunityCard({ opp, saved, onToggleSave, onOpen, match }) {
  return (
    <article className="card">
      <div className="flex items-center justify-between gap-2">
        <span className={`type-badge ${TYPE_CLASS[opp.type] || ''}`}>{opp.type}</span>
        <button
          type="button"
          className={`save-btn ${saved ? 'is-saved' : ''}`}
          onClick={() => onToggleSave(opp.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${opp.name} from my list` : `Save ${opp.name} to my list`}
        >
          <IconBookmark filled={saved} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      <button type="button" className="card-main" onClick={() => onOpen(opp)}>
        <h3>{opp.name}</h3>
        <p className="card-org">by {opp.org}</p>
        <p className="card-coverage">{opp.coverage}</p>
      </button>

      {match && (
        <div className="match-box">
          <div className="match-score">
            <span className="match-percent">{match.score}%</span>
            <span className="match-word">match</span>
          </div>
          <ul className="match-reasons">
            {match.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-tags">
        {opp.regions.map((r) => (
          <span key={r} className="tag">{r}</span>
        ))}
        {opp.fields.map((f) => (
          <span key={f} className="tag tag-field">{FIELD_LABELS[f] || f}</span>
        ))}
        {opp.levels.map((l) => (
          <span key={l} className="tag tag-level">{labelForLevel(l)}</span>
        ))}
      </div>

      <div className="card-foot">
        <DeadlineBadge deadline={opp.deadline} />
        <button type="button" className="details-link" onClick={() => onOpen(opp)}>
          Read more <IconArrow />
        </button>
      </div>
    </article>
  );
}

function DetailModal({ opp, saved, checklist, onToggleSave, onToggleDoc, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const progress = checklistProgress(checklist);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={opp.name}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close details">
          x
        </button>
        <span className={`type-badge ${TYPE_CLASS[opp.type] || ''}`}>{opp.type}</span>
        <h2>{opp.name}</h2>
        <p className="card-org">by {opp.org}</p>
        <div className="mt-4">
          <DeadlineBadge deadline={opp.deadline} />
        </div>

        <h3>What you get</h3>
        <p>{opp.coverage}</p>

        <h3>About this opportunity</h3>
        <p className="drop-cap">{opp.description}</p>

        <h3>Who it is for</h3>
        <p>{opp.whoFor}</p>

        <h3>How to apply</h3>
        <ol className="steps">
          {opp.howToApply.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h3>Documents you will need</h3>
        {saved ? (
          <>
            <div className="progress-row mt-3">
              <div className="progress-bar" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <span>{progress.done} of {progress.total} ready</span>
            </div>
            <ul className="doc-list mt-2">
              {checklist.map((item) => (
                <li key={item.id}>
                  <label className={item.done ? 'doc-done' : ''}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onToggleDoc(opp.id, item.id)}
                    />
                    <span className="doc-check"><IconCheck /></span>
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
            {progress.percent === 100 && (
              <p className="ready-note">All documents ready. You are set to apply. Good luck!</p>
            )}
          </>
        ) : (
          <>
            <ul className="doc-list doc-preview mt-2">
              {opp.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
            <p className="hint">Save this opportunity to tick off documents as you get them ready.</p>
          </>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className={`btn ${saved ? 'btn-ghost' : 'btn-primary'}`}
            onClick={() => onToggleSave(opp.id)}
          >
            <IconBookmark filled={saved} />
            {saved ? 'Remove from my list' : 'Save to my list'}
          </button>
          <a className="btn btn-berry" href={opp.link} target="_blank" rel="noreferrer">
            Visit official site
          </a>
        </div>
        <p className="fine-print">
          Listings here are samples for this demo. Always confirm dates and requirements on the
          official site before you apply.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('discover');
  const [filters, setFilters] = useState({ query: '', type: 'all', level: 'all', region: 'all', field: 'all' });
  const [sortMode, setSortMode] = useState('deadline');
  const [openOpp, setOpenOpp] = useState(null);
  const [state, setState] = useState(loadState);
  const [quiz, setQuiz] = useState(
    () => loadState().profile || { level: 'undergraduate', field: 'STEM', region: 'Nigeria', interests: ['Scholarship'] },
  );
  const [quizDone, setQuizDone] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage can be unavailable in some browsers. The app still works.
    }
  }, [state]);

  const savedSet = useMemo(() => new Set(state.saved), [state.saved]);

  const visible = useMemo(() => {
    const filtered = filterOpportunities(OPPORTUNITIES, filters);
    return sortOpportunities(filtered, sortMode, TODAY);
  }, [filters, sortMode]);

  const matches = useMemo(() => rankMatches(OPPORTUNITIES, quiz, TODAY), [quiz]);
  const topMatches = matches.filter((m) => m.score >= 55);
  const closingSoon = closingSoonCount(OPPORTUNITIES, TODAY, 60);

  const savedOpps = useMemo(
    () => OPPORTUNITIES.filter((opp) => savedSet.has(opp.id)),
    [savedSet],
  );

  function checklistFor(opp) {
    const saved = state.checklists[opp.id];
    return saved ? mergeChecklist(opp.documents, saved) : buildChecklist(opp.documents);
  }

  function toggleSave(id) {
    setState((prev) => {
      const isSaved = prev.saved.includes(id);
      const saved = isSaved ? prev.saved.filter((x) => x !== id) : [...prev.saved, id];
      const checklists = { ...prev.checklists };
      if (!isSaved && !checklists[id]) {
        const opp = OPPORTUNITIES.find((o) => o.id === id);
        if (opp) checklists[id] = buildChecklist(opp.documents);
      }
      return { ...prev, saved, checklists };
    });
  }

  function toggleDoc(oppId, docId) {
    setState((prev) => {
      const opp = OPPORTUNITIES.find((o) => o.id === oppId);
      if (!opp) return prev;
      const current = prev.checklists[oppId]
        ? mergeChecklist(opp.documents, prev.checklists[oppId])
        : buildChecklist(opp.documents);
      const updated = current.map((item) =>
        item.id === docId ? { ...item, done: !item.done } : item,
      );
      return { ...prev, checklists: { ...prev.checklists, [oppId]: updated } };
    });
  }

  function toggleInterest(type) {
    setQuiz((prev) => {
      const has = prev.interests.includes(type);
      return {
        ...prev,
        interests: has ? prev.interests.filter((t) => t !== type) : [...prev.interests, type],
      };
    });
  }

  function runQuiz() {
    setQuizDone(true);
    setState((prev) => ({ ...prev, profile: quiz }));
  }

  function resetFilters() {
    setFilters({ query: '', type: 'all', level: 'all', region: 'all', field: 'all' });
  }

  const totalDocsReady = savedOpps.reduce(
    (sum, opp) => sum + checklistProgress(checklistFor(opp)).done,
    0,
  );
  const totalDocs = savedOpps.reduce(
    (sum, opp) => sum + checklistProgress(checklistFor(opp)).total,
    0,
  );

  const navBtn = (active) =>
    `nav-btn relative px-1 py-2 text-[13px] font-bold uppercase tracking-[0.16em] transition-colors cursor-pointer bg-transparent border-0 ${
      active ? 'text-plum-950 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-rose-600' : 'text-plum-500 hover:text-plum-800'
    }`;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-blush-50/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <span className="block font-display text-[1.6rem] font-extrabold leading-none tracking-tight text-plum-950">
                HerPath
              </span>
              <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700">
                Your next step starts here
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-5" aria-label="Main">
            <button type="button" className={navBtn(view === 'discover')} onClick={() => setView('discover')}>
              Discover
            </button>
            <button type="button" className={navBtn(view === 'match')} onClick={() => setView('match')}>
              Find my match
            </button>
            <button type="button" className={navBtn(view === 'list')} onClick={() => setView('list')}>
              My list
              {state.saved.length > 0 && (
                <span className="nav-count ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">
                  {state.saved.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {view === 'discover' && (
        <main>
          <section className="hero border-b border-line bg-gradient-to-b from-blush-100 to-blush-50">
            <div className="mx-auto max-w-4xl px-5 pb-14 pt-12 text-center">
              <div className="flex items-center justify-center gap-4">
                <span className="hidden h-px flex-1 bg-plum-300 sm:block" aria-hidden="true" />
                <p className="kicker">Education and Opportunity</p>
                <span className="hidden h-px flex-1 bg-plum-300 sm:block" aria-hidden="true" />
              </div>
              <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Your future is <em className="font-semibold italic text-rose-600">calling</em>.
                Let us find your door.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-left text-base leading-relaxed text-plum-900/85 sm:text-lg">
                <span className="drop-cap">
                  HerPath gathers real scholarships, internships, mentorships and fellowships for
                  girls and women, matches them to your level, field and region, and helps you
                  get every document ready before the deadline.
                </span>
              </p>

              <div className="hero-stats mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-line border-y border-line py-5">
                <div className="px-3">
                  <strong className="block font-display text-3xl font-extrabold text-plum-950 sm:text-4xl">
                    {OPPORTUNITIES.length}
                  </strong>
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-plum-500">
                    opportunities listed
                  </span>
                </div>
                <div className="px-3">
                  <strong className="block font-display text-3xl font-extrabold text-plum-950 sm:text-4xl">
                    {closingSoon}
                  </strong>
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-plum-500">
                    closing in 60 days
                  </span>
                </div>
                <div className="px-3">
                  <strong className="block font-display text-3xl font-extrabold text-plum-950 sm:text-4xl">
                    {TYPES.length}
                  </strong>
                  <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-plum-500">
                    kinds of support
                  </span>
                </div>
              </div>

              <button type="button" className="btn btn-primary btn-big mt-9" onClick={() => setView('match')}>
                Find my match <IconArrow />
              </button>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-5 py-10">
            <div className="flex flex-wrap items-end gap-4">
              <label className="search-box relative min-w-64 flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-plum-400">
                  <IconSearch />
                </span>
                <input
                  type="search"
                  className="search-input pl-10"
                  placeholder="Search scholarships, mentors, internships..."
                  value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                  aria-label="Search opportunities"
                />
              </label>
              <label className="field-label">
                Sort by
                <select className="select-input" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
                  <option value="deadline">Deadline soonest</option>
                  <option value="newest">Newest listed</option>
                  <option value="name">Name A to Z</option>
                </select>
              </label>
            </div>

            <div className="chip-row mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
              <button
                type="button"
                className={filters.type === 'all' ? 'chip is-active' : 'chip'}
                onClick={() => setFilters({ ...filters, type: 'all' })}
              >
                Everything
              </button>
              {TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={filters.type === type ? 'chip is-active' : 'chip'}
                  onClick={() => setFilters({ ...filters, type })}
                >
                  {type}s
                </button>
              ))}
            </div>

            <div className="select-row mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="field-label">
                I am in
                <select
                  className="select-input"
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                >
                  <option value="all">Any level</option>
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                I live in
                <select
                  className="select-input"
                  value={filters.region}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                >
                  <option value="all">Anywhere</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                My field is
                <select
                  className="select-input"
                  value={filters.field}
                  onChange={(e) => setFilters({ ...filters, field: e.target.value })}
                >
                  <option value="all">Any field</option>
                  {FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-7 border-b border-line pb-3 text-sm font-medium text-plum-500" role="status">
              Showing {visible.length} of {OPPORTUNITIES.length} opportunities
            </p>

            {visible.length === 0 ? (
              <div className="empty-box mt-8">
                <h2>Nothing matches that search yet</h2>
                <p>Try a shorter search word, or clear the filters to see everything again.</p>
                <button type="button" className="btn btn-primary" onClick={resetFilters}>
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="card-grid mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    saved={savedSet.has(opp.id)}
                    onToggleSave={toggleSave}
                    onOpen={setOpenOpp}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {view === 'match' && (
        <main className="mx-auto max-w-6xl px-5 py-10">
          <section className="quiz-card rounded-2xl border border-line bg-paper p-6 shadow-card sm:p-9">
            <p className="kicker">The matchmaker</p>
            <h1 className="mt-3 text-4xl font-extrabold">Tell us about you</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-plum-900/80">
              Four quick answers, and HerPath will rank every opportunity by how well it fits you,
              with the reasons spelled out.
            </p>
            <div className="mt-7 grid grid-cols-1 gap-4 border-t border-line pt-7 sm:grid-cols-3">
              <label className="field-label">
                Your education level
                <select className="select-input" value={quiz.level} onChange={(e) => setQuiz({ ...quiz, level: e.target.value })}>
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                  <option value="any">Not sure yet</option>
                </select>
              </label>
              <label className="field-label">
                Your field of study
                <select className="select-input" value={quiz.field} onChange={(e) => setQuiz({ ...quiz, field: e.target.value })}>
                  {FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                  <option value="any">Still exploring</option>
                </select>
              </label>
              <label className="field-label">
                Where you live
                <select className="select-input" value={quiz.region} onChange={(e) => setQuiz({ ...quiz, region: e.target.value })}>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="any">Somewhere else</option>
                </select>
              </label>
            </div>
            <fieldset className="mt-7">
              <legend className="text-sm font-semibold text-plum-800">
                What are you hoping for? Pick as many as you like.
              </legend>
              <div className="chip-row mt-3 flex flex-wrap gap-2">
                {TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={quiz.interests.includes(type) ? 'chip is-active' : 'chip'}
                    onClick={() => toggleInterest(type)}
                    aria-pressed={quiz.interests.includes(type)}
                  >
                    {type}s
                  </button>
                ))}
              </div>
            </fieldset>
            <button type="button" className="btn btn-primary btn-big mt-8" onClick={runQuiz}>
              Show my matches <IconArrow />
            </button>
          </section>

          {quizDone && (
            <section className="mt-12" aria-live="polite">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-plum-700 pb-3">
                <h2 className="text-3xl font-extrabold">Your best matches</h2>
                <span className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-700">
                  {topMatches.length} strong fits
                </span>
              </div>
              {topMatches.length === 0 ? (
                <div className="empty-box mt-8">
                  <h2>No strong matches yet</h2>
                  <p>
                    Try picking more kinds of support above, or browse everything on the Discover
                    page. New doors open all the time.
                  </p>
                </div>
              ) : (
                <div className="card-grid mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {topMatches.map((m) => (
                    <OpportunityCard
                      key={m.opp.id}
                      opp={m.opp}
                      saved={savedSet.has(m.opp.id)}
                      onToggleSave={toggleSave}
                      onOpen={setOpenOpp}
                      match={m}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      )}

      {view === 'list' && (
        <main className="mx-auto max-w-6xl px-5 py-10">
          <p className="kicker">Your applications</p>
          <h1 className="mt-3 text-4xl font-extrabold">My list</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-plum-900/80">
            Everything you saved, with a document checklist for each one. Tick things off as you
            get them ready, and watch the bars fill up.
          </p>

          {savedOpps.length === 0 ? (
            <div className="empty-box mt-10">
              <h2>Your list is empty for now</h2>
              <p>
                When you find an opportunity you like, tap Save and it will wait for you here with
                its own checklist.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setView('discover')}>
                Browse opportunities
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4 rounded-2xl border border-line bg-paper px-6 py-5 shadow-card">
                <div>
                  <strong className="block font-display text-3xl font-extrabold text-plum-950">
                    {savedOpps.length}
                  </strong>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-plum-500">
                    saved {savedOpps.length === 1 ? 'opportunity' : 'opportunities'}
                  </span>
                </div>
                <div>
                  <strong className="block font-display text-3xl font-extrabold text-plum-950">
                    {totalDocsReady} / {totalDocs}
                  </strong>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-plum-500">
                    documents ready
                  </span>
                </div>
                <div className="progress-bar progress-wide min-w-48 flex-1" aria-hidden="true">
                  <div
                    className="progress-fill"
                    style={{ width: `${totalDocs === 0 ? 0 : Math.round((totalDocsReady / totalDocs) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {savedOpps.map((opp) => {
                  const checklist = checklistFor(opp);
                  const progress = checklistProgress(checklist);
                  return (
                    <article key={opp.id} className="saved-card card">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className={`type-badge ${TYPE_CLASS[opp.type] || ''}`}>{opp.type}</span>
                          <h3 className="mt-2 font-display text-2xl font-bold leading-snug">{opp.name}</h3>
                          <p className="card-org">by {opp.org}</p>
                        </div>
                        <DeadlineBadge deadline={opp.deadline} />
                      </div>
                      <div className="progress-row">
                        <div className="progress-bar" aria-hidden="true">
                          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
                        </div>
                        <span>{progress.done} of {progress.total} documents ready</span>
                      </div>
                      <ul className="doc-list">
                        {checklist.map((item) => (
                          <li key={item.id}>
                            <label className={item.done ? 'doc-done' : ''}>
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleDoc(opp.id, item.id)}
                              />
                              <span className="doc-check"><IconCheck /></span>
                              {item.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                      {progress.percent === 100 && (
                        <p className="ready-note">All documents ready. Time to apply. We are rooting for you!</p>
                      )}
                      <div className="mt-auto flex gap-2 border-t border-line pt-4">
                        <button type="button" className="btn btn-ghost" onClick={() => setOpenOpp(opp)}>
                          See details
                        </button>
                        <button type="button" className="btn btn-danger-ghost" onClick={() => toggleSave(opp.id)}>
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </main>
      )}

      <footer className="mt-16 border-t border-line bg-blush-100/60">
        <div className="rule-double mx-auto max-w-6xl px-5 py-10">
          <div className="flex items-center gap-3">
            <LogoMark />
            <span className="font-display text-2xl font-extrabold text-plum-950">HerPath</span>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-plum-900/75">
            Built for the InnovateHER Hackathon, Education and Opportunity track. Listings are
            sample data for this demo, so always confirm details on the official site before you
            apply. Your saved list and checklists stay on your own device.
          </p>
          <p className="mt-4 font-display text-lg italic text-plum-700">
            You belong in every room you dream of. Keep going.
          </p>
        </div>
      </footer>

      {openOpp && (
        <DetailModal
          opp={openOpp}
          saved={savedSet.has(openOpp.id)}
          checklist={checklistFor(openOpp)}
          onToggleSave={toggleSave}
          onToggleDoc={toggleDoc}
          onClose={() => setOpenOpp(null)}
        />
      )}
    </div>
  );
}
