import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const url = 'file:///' + path.join(here, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('in')));
await page.locator('#stack').scrollIntoViewIfNeeded();
await page.waitForTimeout(3500); // give the auto-build time to finish

await page.locator('#stack').screenshot({ path: path.join(here, 'qa', 'stacker.png') });

// mobile view, with the sticky bar
const m = await browser.newPage({ viewport: { width: 375, height: 812 } });
await m.goto(url, { waitUntil: 'networkidle' });
await m.evaluate(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('in')));
await m.locator('#menu').scrollIntoViewIfNeeded();
await m.waitForTimeout(400);
await m.screenshot({ path: path.join(here, 'qa', 'mobile-menu.png') });
await browser.close();
console.log('done');
