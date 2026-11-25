# HerPath

HerPath is a friendly web app that helps girls and women find scholarships,
internships, mentorships, bootcamps, fellowships and competitions, match them
to their own goals, and get every application document ready before the
deadline.

Built for the InnovateHER Hackathon (Girls Who Code), Education and
Opportunity track.

## What it does

- **Discover**: browse 18 real programmes in one place. Search by keyword,
  filter by type (scholarship, internship, mentorship, bootcamp, fellowship,
  competition), education level, region and field of study, and sort by
  deadline. Every card shows what the programme covers and a live countdown
  to its deadline.
- **Find my match**: answer four quick questions (education level, field of
  study, where you live, and what kind of support you want) and HerPath
  ranks every opportunity with a match percentage and plain-English reasons,
  so you can see exactly why something fits you.
- **Details**: open any opportunity to see what you get, who it is for, the
  steps to apply, and the documents you will need.
- **My list**: save the opportunities you like and tick off documents as you
  get them ready. Progress bars show how close each application is to done.
  Everything is saved on your own device with localStorage, so it works
  offline and needs no account.

## Tech

- React and Vite
- Tailwind CSS v4 with a small design system of owned component patterns
  (buttons, badges, chips, cards, inputs, progress bars, modal) in
  `src/index.css`: editorial magazine look, blush pink and plum, Playfair
  Display headlines with Inter body text, self-hosted fonts
- All matching, filtering, deadline and checklist maths written as pure
  functions in `src/lib/logic.js`, covered by unit tests
- localStorage for persistence. No backend, no API keys.

## Run it

```bash
npm install
npm run dev
```

Open the local address Vite prints. The app comes with sample listings, so
every screen works straight away. Use the filters, try the match quiz, save
an opportunity and tick off a document.

## Tests

```bash
npm test          # unit tests for the core logic (node test runner)
npm run build     # production build
node scripts/e2e.mjs   # Playwright end to end checks + screenshots in docs/
```

## Project structure

- `src/lib/logic.js` - pure functions: deadlines, urgency, search, filters,
  sorting, match scoring, checklist progress
- `src/lib/logic.test.js` - unit tests for the logic
- `src/data/opportunities.js` - the sample catalogue of 18 programmes
- `src/App.jsx` - the three screens (Discover, Find my match, My list) and
  the detail view
- `src/index.css` - the Tailwind design system (theme tokens + component
  classes)
- `public/fonts/` - self-hosted Playfair Display and Inter (woff2)
- `scripts/e2e.mjs` - Playwright checks that also capture the screenshots
  in `docs/`

## A note on the listings

The 18 programmes listed are real, well known opportunities, but the dates
and details in this demo are samples. The app tells users to always confirm
on the official site before applying. In a production version, the catalogue
would be updated from the programmes' own announcements.

## Credits

- React, Vite and Tailwind CSS (open source)
- Playfair Display and Inter fonts from Google Fonts (OFL licence),
  self-hosted in the repo
