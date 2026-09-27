import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const png = fs.readFileSync('/tmp/p32.png');
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const b = await chromium.launch();
for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 1300, height: 1000 }, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.goto('http://localhost:5173/en-US/projects', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(5000);
    await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => (e.textContent || '').trim() === '+')?.click());
    await p.waitForTimeout(6000);
    await p.locator('[data-uiid="addSource"]').click();
    const d = p.getByRole('dialog');
    await d.waitFor();
    const scan = async (label) => {
        await p.waitForTimeout(700);
        const r = await new AxeBuilder({ page: p }).withTags(tags).include('dialog[open]').analyze();
        const v = r.violations.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes[0]?.target.join(' ')}`);
        console.log(`${scheme} ${label}: ${v.length === 0 ? 'clean' : v.join(' | ')}`);
    };
    await d.getByRole('tab').nth(1).click();
    await d.locator('input[type="file"]').setInputFiles({ name: 'p32.png', mimeType: 'image/png', buffer: png });
    await scan('image/device');
    await d.getByRole('radio').nth(1).click();
    await p.waitForTimeout(3000);
    await scan('image/camera (no camera)');
    await d.getByRole('tab').nth(2).click();
    await scan('table empty');
    await d.getByRole('textbox').fill('just words');
    await scan('table not-csv');
    await d.getByRole('textbox').fill('name, legs\ncat, 4\nbird, 2');
    await scan('table ok');
    await d.getByRole('tab').nth(3).click();
    await scan('song');
    await ctx.close();
}
await b.close();
