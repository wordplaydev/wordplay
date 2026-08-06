import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * The music editor's playback feedback, which can only be observed in a
 * browser: the playhead advances on the audio clock, and the two play buttons
 * share one preview.
 */

/** The palette shares a split with the output tile, so both need room. */
test.use({ viewport: { width: 1600, height: 1000 } });

async function loadCode(
    page: Parameters<typeof createTestProject>[0],
    code: string,
) {
    const editor = page.getByTestId('editor').first();
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Backspace');
    await page.evaluate((source) => navigator.clipboard.writeText(source), code);
    await page.keyboard.press('ControlOrMeta+v');
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message: 'source did not load into the editor',
        })
        .toContain('Music');
}

test('the playhead appears and advances while previewing', async ({ page }) => {
    test.setTimeout(90000);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    // Slow and long, so the head has somewhere to travel and time to do it.
    await loadCode(page, 'Music(Track([1 2 3 4 5 6 7 8]) tempo: 60beats/min)');

    // Put the caret inside the music, which is what selects it for the palette.
    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const palette = page.getByTestId('palette');
    await expect(palette).toBeVisible({ timeout: 10000 });

    // The staff renders once a music is selected.
    const staff = palette.locator('.staff');
    await expect(staff).toBeVisible({ timeout: 10000 });
    // Notes are real buttons, so there is something to focus and to hear.
    await expect(staff.locator('.mark').first()).toBeVisible({
        timeout: 10000,
    });

    // Nothing plays yet, so there is no playhead.
    await expect(staff.locator('.playhead')).toHaveCount(0);

    // Press the whole-music play button.
    const play = palette.getByRole('button', { name: /hear this music/ });
    await expect(play).toBeVisible({ timeout: 10000 });
    await play.click();

    // The playhead should appear...
    const playhead = staff.locator('.playhead');
    await expect(playhead).toHaveCount(1, { timeout: 10000 });

    // ...and move. Sampled twice with a real gap: the position advances on the
    // audio clock, so this is the only way to tell a live head from a drawn one.
    const at = async () =>
        Number(
            (await playhead.evaluate((el) => getComputedStyle(el).left)).replace(
                'px',
                '',
            ),
        );
    const first = await at();
    await page.waitForTimeout(1500);
    const second = await at();
    expect(
        second,
        `playhead did not advance: ${first}px then ${second}px`,
    ).toBeGreaterThan(first);
});

test('only one play button owns the preview at a time', async ({ page }) => {
    test.setTimeout(90000);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    await loadCode(page, 'Music(Track([1 2 3 4]) tempo: 60beats/min)');

    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const palette = page.getByTestId('palette');
    await expect(palette).toBeVisible({ timeout: 10000 });

    const music = palette.getByRole('button', { name: /hear this music/ });
    const track = palette.getByRole('button', { name: /hear this track/ });
    await expect(music).toBeVisible({ timeout: 10000 });
    await expect(track).toBeVisible({ timeout: 10000 });

    // Both are available before anything plays.
    await expect(music).toHaveAttribute('aria-disabled', 'false');
    await expect(track).toHaveAttribute('aria-disabled', 'false');

    await music.click();
    // While the music plays, the track button must not also be pressable —
    // there is one preview, and two owners of it behave unpredictably.
    await expect(track).toHaveAttribute('aria-disabled', 'true', {
        timeout: 5000,
    });
    await expect(music).toHaveAttribute('aria-disabled', 'false');
});

/** A Standard MIDI File with `tracks` x `perTrack` notes, built in memory. */
function midiBytes(tracks: number, perTrack: number): Buffer {
    const bytes: number[] = [];
    const u32 = (n: number) => [
        (n >> 24) & 255,
        (n >> 16) & 255,
        (n >> 8) & 255,
        n & 255,
    ];
    const u16 = (n: number) => [(n >> 8) & 255, n & 255];
    const vlq = (n: number) => {
        const out = [n & 0x7f];
        n >>= 7;
        while (n > 0) {
            out.unshift((n & 0x7f) | 0x80);
            n >>= 7;
        }
        return out;
    };
    bytes.push(
        0x4d, 0x54, 0x68, 0x64,
        ...u32(6), ...u16(1), ...u16(tracks), ...u16(480),
    );
    for (let t = 0; t < tracks; t++) {
        const data: number[] = [];
        for (let i = 0; i < perTrack; i++) {
            data.push(...vlq(0), 0x90, 48 + ((i + t) % 36), 100);
            data.push(...vlq(240), 0x80, 48 + ((i + t) % 36), 0);
        }
        data.push(0x00, 0xff, 0x2f, 0x00);
        bytes.push(0x4d, 0x54, 0x72, 0x6b, ...u32(data.length), ...data);
    }
    return Buffer.from(bytes);
}

test('importing a large MIDI file finishes rather than hanging', async ({
    page,
}) => {
    test.setTimeout(120000);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await createTestProject(page);
    await loadCode(page, 'Music(Track([1 2 3]))');

    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const palette = page.getByTestId('palette');
    await expect(palette).toBeVisible({ timeout: 10000 });

    // 4 x 800 = 3,200 notes. Splicing this as nodes took 79 seconds; appending
    // it as text takes a fraction of a second. The assertion is the point: if
    // the quadratic path ever comes back, this fails instead of freezing a tab
    // for someone to discover by hand.
    const started = Date.now();
    await palette
        .locator('input[type="file"]')
        .setInputFiles({
            name: 'big.mid',
            mimeType: 'audio/midi',
            buffer: midiBytes(4, 800),
        });

    // The editor should end up holding the imported notes.
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message: 'the import never landed in the editor',
            timeout: 60000,
        })
        .toContain('Instrument');

    const elapsed = Date.now() - started;
    expect(
        elapsed,
        `import of 3,200 notes took ${elapsed}ms`,
    ).toBeLessThan(30000);
});
