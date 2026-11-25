// End to end checks for HerPath. Serves the production build with vite
// preview, walks every screen, asserts the key behaviours, fails on any
// console error, and saves screenshots into docs/.
// Run with: npm run build && node scripts/e2e.mjs
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 4177;
const BASE = `http://localhost:${PORT}/`;
mkdirSync('docs', { recursive: true });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'pipe',
});

function waitForServer(url, tries = 40) {
  return new Promise((resolve, reject) => {
    const attempt = async (left) => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
        throw new Error('not ready');
      } catch {
        if (left <= 0) return reject(new Error('preview server did not start'));
        setTimeout(() => attempt(left - 1), 250);
      }
    };
    attempt(tries);
  });
}

let passed = 0;
let failed = 0;
function check(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`);
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

try {
  await waitForServer(BASE);
  await page.goto(BASE, { waitUntil: 'networkidle' });

  console.log('Discover screen');
  check('hero headline shows', await page.locator('.hero h1').isVisible());
  check('hero stats show 18 opportunities', (await page.locator('.hero-stats').innerText()).includes('18'));
  const cardCount = await page.locator('.card-grid .card').count();
  check(`all 18 cards render (saw ${cardCount})`, cardCount === 18);
  await page.screenshot({ path: 'docs/1-discover.png', fullPage: false });

  console.log('Search and filters');
  await page.fill('.search-box input', 'mentorship');
  await page.waitForTimeout(200);
  const mentorshipCount = await page.locator('.card-grid .card').count();
  check(`search narrows results (saw ${mentorshipCount})`, mentorshipCount >= 2 && mentorshipCount < 18);
  await page.fill('.search-box input', '');
  await page.click('.chip-row .chip:has-text("Scholarships")');
  await page.waitForTimeout(200);
  const scholarshipCount = await page.locator('.card-grid .card').count();
  check(`type chip filters (saw ${scholarshipCount})`, scholarshipCount >= 5 && scholarshipCount < 18);
  await page.click('.chip-row .chip:has-text("Everything")');
  await page.selectOption('.select-row select >> nth=1', 'Nigeria');
  await page.waitForTimeout(200);
  const nigeriaCount = await page.locator('.card-grid .card').count();
  check(`region filter works (saw ${nigeriaCount})`, nigeriaCount >= 3 && nigeriaCount < 18);
  await page.selectOption('.select-row select >> nth=1', 'all');
  await page.fill('.search-box input', 'zzzznope');
  await page.waitForTimeout(200);
  check('empty state shows', await page.locator('.empty-box').isVisible());
  await page.click('.empty-box .btn');
  await page.waitForTimeout(200);
  check('clear filters restores cards', (await page.locator('.card-grid .card').count()) === 18);

  console.log('Detail modal');
  await page.locator('.card-grid .card .card-main').first().click();
  await page.waitForTimeout(300);
  check('modal opens', await page.locator('.modal').isVisible());
  check('modal shows how to apply', (await page.locator('.modal').innerText()).includes('How to apply'));
  await page.screenshot({ path: 'docs/2-detail.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('modal closes with Escape', (await page.locator('.modal').count()) === 0);

  console.log('Save flow and My list');
  await page.locator('.card-grid .card .save-btn').first().click();
  await page.waitForTimeout(200);
  check('nav count badge shows 1', (await page.locator('.nav-count').innerText()) === '1');
  await page.click('.nav-btn:has-text("My list")');
  await page.waitForTimeout(300);
  check('saved card appears in My list', (await page.locator('.saved-card').count()) === 1);
  const firstDoc = page.locator('.saved-card .doc-list label').first();
  await firstDoc.click();
  await page.waitForTimeout(200);
  const progressText = await page.locator('.saved-card .progress-row').innerText();
  check(`checklist ticks (saw "${progressText.trim()}")`, progressText.includes('1 of'));
  await page.screenshot({ path: 'docs/3-my-list.png', fullPage: true });

  console.log('Persistence across reload');
  await page.reload({ waitUntil: 'networkidle' });
  await page.click('.nav-btn:has-text("My list")');
  await page.waitForTimeout(300);
  const afterReload = await page.locator('.saved-card .progress-row').innerText();
  check('saved item and tick survive reload', afterReload.includes('1 of'));

  console.log('Find my match quiz');
  await page.click('.nav-btn:has-text("Find my match")');
  await page.waitForTimeout(300);
  check('quiz form shows', await page.locator('.quiz-card').isVisible());
  await page.screenshot({ path: 'docs/4-quiz.png' });
  await page.click('.quiz-card .btn-primary');
  await page.waitForTimeout(300);
  const matchCount = await page.locator('.card-grid .card .match-box').count();
  check(`matches ranked with scores (saw ${matchCount})`, matchCount >= 3);
  const firstPercent = await page.locator('.match-percent').first().innerText();
  check(`top match has a percent (saw ${firstPercent})`, /^\d+%$/.test(firstPercent.trim()));
  await page.screenshot({ path: 'docs/5-matches.png', fullPage: true });

  console.log('Mobile view');
  await page.setViewportSize({ width: 390, height: 780 });
  await page.click('.nav-btn:has-text("Discover")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'docs/6-mobile.png' });
  check('mobile hero visible', await page.locator('.hero h1').isVisible());

  console.log('Console errors');
  check(`zero console errors (saw ${consoleErrors.length})`, consoleErrors.length === 0);
  if (consoleErrors.length > 0) console.log(consoleErrors);
} finally {
  await browser.close();
  server.kill();
}

console.log(`\nE2E result: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
