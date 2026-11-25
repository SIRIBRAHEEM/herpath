# HerPath - Devpost submission texts for InnovateHER Hackathon

Copy each block into the matching Devpost field.

## Project name

HerPath

## Tagline

Find scholarships, internships and mentors made for you, and get every document ready before the deadline.

## Challenge track

Education & Opportunity

## Team

Ibrahim Yahaya (solo), student at the Federal University of Technology Minna, Nigeria.

## What problem are you trying to solve?

Every year, thousands of scholarships, internships, mentorship programmes and fellowships open for girls and women, and every year many of them close with empty seats. The problem is not that the opportunities do not exist. The problem is that they are scattered across dozens of websites, announced at different times, written in confusing language, and easy to miss. A girl in secondary school in Minna or a young woman at university has to know where to look, work out if she even qualifies, remember the deadline, and then gather documents like transcripts, statements and recommendation letters, often with nobody to guide her. Many give up before they start, or find out about a programme one week after it closed.

## Why is this problem important?

Education funding and early career support change the direction of a girl's life. A scholarship can be the difference between dropping out and graduating. A mentor can be the difference between guessing and having a plan. But access to these doors is uneven: girls with educated parents or good internet hear about them early, while girls without those advantages hear about them late or never. Closing that information gap is one of the cheapest, most practical ways to open opportunity to more girls and women.

## How does your solution work?

HerPath brings the opportunities into one friendly place and walks the user through three simple steps.

First, Discover. The app lists 18 real programmes, from the Mastercard Foundation Scholars Program to She Code Africa mentorships and Nigerian scholarships like MTN Foundation and NNPC/TotalEnergies. Each card shows what the programme covers, who it is for, and a live countdown to its deadline, colour coded by urgency. Users can search, filter by type, education level, region and field of study, and sort by deadline so nothing sneaks past them.

Second, Find my match. The user answers four quick questions: education level, field of study, where she lives, and what kind of support she wants. HerPath scores every opportunity against her answers and ranks them with a match percentage and plain reasons, for example "Made for applicants in Nigeria" or "Fits your STEM path". The scoring is honest maths, not a black box: level, region, field and interest each carry a fixed weight, and the reasons shown are the exact reasons the score went up.

Third, My list. She saves the opportunities she likes, and each saved item comes with a document checklist (transcript, personal statement, recommendation letter, and so on). She ticks documents off as she gets them ready and watches the progress bar fill. Everything is stored on her own device with localStorage, so the app works offline, needs no account, and keeps her plans private.

## What technologies did you use?

- React and Vite for the app
- Plain CSS written from scratch: warm cream background, berry and coral colours, Fraunces headings with Nunito Sans body text, self-hosted fonts so it works offline
- localStorage for saving her list, checklists and quiz answers on the device
- The core logic (deadline countdowns, urgency bands, search, filters, sorting, match scoring, checklist progress) is written as pure functions in one file and covered by 15 unit tests, plus Playwright end to end checks on every screen

## What challenges did you face?

The hardest part was making the match score feel fair and explainable. A simple "yes or no" filter would hide good opportunities from girls who do not tick every box, so I built a weighted score instead: a programme made for her exact region scores higher than a global one, but the global one still shows up with its reason stated. I also had to handle deadlines carefully, so closed programmes sink to the bottom and urgent ones stand out, and design checklists that survive even when the catalogue wording changes. On the design side, I wanted the app to feel warm and encouraging, like a big sister who has done this before, not like a cold government portal. That meant friendly words everywhere, soft colours, and encouragement at the exact moments where users usually give up, like the empty list screen.

## What would you improve or add in the future?

- Live listings pulled from programme announcements, with deadline reminders by email or SMS
- A personal statement helper with sentence starters and examples
- A mentor directory so girls can ask questions before applying
- More Nigerian and African programmes, plus support for French and Hausa
- A simple calendar export so deadlines land in her phone calendar

## Demo

- Live demo: [add the deployed link here]
- Demo video: [add the YouTube link here]
- Source code: [add the GitHub repo link here]
- Screenshots: in the docs folder of the repo (Discover, detail view, My list, match quiz, match results, mobile view)

## Setup steps

```bash
npm install
npm run dev
```

Open the local address Vite prints. The app includes sample listings, so every screen works immediately: browse Discover, run the Find my match quiz, save an opportunity and tick off a document.

## Credits and acknowledgements

- React and Vite (open source)
- Fraunces and Nunito Sans fonts from Google Fonts (OFL licence), self-hosted in the repo
- The 18 programmes listed are real, well known opportunities; dates and details in this demo are samples, and the app tells users to confirm on the official site before applying
- AI tools used: an AI coding assistant helped me write and test the code. The idea, design and final product are mine.
- All work on this project was done during the InnovateHER hacking period (from 13 Nov 2026).
