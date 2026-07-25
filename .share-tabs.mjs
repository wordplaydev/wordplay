import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });

const url = 'http://localhost:5173/project/example-Adventure?mode=edit';
for (let i = 0; i < 3; i++) {          // retry past the pre-existing Dimension race
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    if (await page.locator('[data-uiid="shareDialog"] button').count()) break;
}
// Remix it so the Remixes tab has real provenance to show.
await page.locator('button', { hasText: 'remix' }).first().click();
await page.waitForTimeout(8000);

await page.locator('[data-uiid="shareDialog"] button').first().click();
await page.waitForTimeout(4000);

const dialog = page.locator('dialog[open]').first();
const tabs = dialog.locator('[role=tab]');
console.log('tab count:', await tabs.count());
console.log('tab labels:', (await tabs.allInnerTexts()).map((t) => t.trim()).join(' | '));

// Is the copy button on the heading line with the title?
const box = async (l) => (await l.first().boundingBox()) ?? {};
const title = await box(dialog.locator('h1, h2, h3').first());
const copy = await box(dialog.locator('button', { hasText: 'copy as text' }));
console.log('title y/h:', title.y?.toFixed(0), title.height?.toFixed(0));
console.log('copy  y/h:', copy.y?.toFixed(0), copy.height?.toFixed(0));
console.log('copy is on the title line:',
    copy.y !== undefined && title.y !== undefined &&
    copy.y < title.y + title.height && copy.y + copy.height > title.y);

await page.screenshot({ path: '/Users/amyko/Code/wordplay/.tabs-gallery.png' });
await tabs.nth(4).click();  // Remixes
await page.waitForTimeout(3000);
console.log('--- Remixes tab ---');
console.log((await dialog.innerText()).slice(0, 420).replace(/\n+/g, ' | '));
await page.screenshot({ path: '/Users/amyko/Code/wordplay/.tabs-remixes.png' });
await browser.close();
