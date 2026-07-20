import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Guards that narrowing the emoji @font-face ranges (removing the broad
 * U+1F000-1FFFF over-claim) didn't break emoji rendering: the emoji faces must
 * still parse, load, and claim real emoji, while no longer claiming a codepoint
 * the font lacks a glyph for.
 */

test('emoji faces still load and claim real emoji, not over-claimed codepoints', async ({
    page,
}) => {
    await createTestProject(page);

    // Render an emoji so the fonts are exercised, then let them settle.
    await page.locator('textarea.keyboard-input').first().focus();
    await page.keyboard.type('"😀👍🏽1️⃣"');
    await page.evaluate(() => document.fonts.ready);

    const checks = await page.evaluate(() => {
        // Union the declared unicode-ranges of every loaded emoji FontFace.
        const intervals: [number, number][] = [];
        for (const face of document.fonts) {
            if (!/Noto (Color )?Emoji/.test(face.family)) continue;
            for (const part of face.unicodeRange.split(',')) {
                const t = part.trim().replace(/^U\+/i, '');
                const m = t.split('-');
                const lo = parseInt(m[0], 16);
                const hi = m[1] !== undefined ? parseInt(m[1], 16) : lo;
                intervals.push([lo, hi]);
            }
        }
        const claimed = (cp: number) =>
            intervals.some(([a, b]) => cp >= a && cp <= b);
        // How much of the SMP emoji plane is claimed — a broad U+1F000-1FFFF
        // over-claim would be the full 0x1000; a precise range is far less.
        let smp = 0;
        for (let cp = 0x1f000; cp <= 0x1ffff; cp++) if (claimed(cp)) smp++;
        return {
            faceCount: intervals.length > 0,
            grin: document.fonts.check('16px "Noto Color Emoji"', '😀'),
            skin: document.fonts.check('16px "Noto Color Emoji"', '👍🏽'),
            grinClaimed: claimed(0x1f600), // 😀 — a real emoji, must be claimed
            overclaimClaimed: claimed(0x1f260), // no glyph — must NOT be claimed
            smp,
        };
    });

    // Emoji faces are present and real emoji still render.
    expect(checks.faceCount).toBe(true);
    expect(checks.grin).toBe(true);
    expect(checks.skin).toBe(true);
    expect(checks.grinClaimed).toBe(true);
    // The narrowing worked: the over-claimed codepoint is no longer declared,
    // and the SMP plane is claimed precisely, not as the broad 0x1000 block.
    expect(checks.overclaimClaimed).toBe(false);
    expect(checks.smp).toBeLessThan(0x1000);
});
