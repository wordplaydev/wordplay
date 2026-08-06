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

    // The palette is gated — it opens on demand rather than because the caret
    // moved — so open it before asking what it shows. Music makes no output to
    // double-click, so the toggle is the only way in.
    await page.locator('[data-uiid="paletteExpand"]').click();

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

    // The line is there, but it isn't playing yet.
    await expect(staff.locator('.cursor')).toHaveCount(1);
    await expect(staff.locator('.cursor.playing')).toHaveCount(0);

    // Press the whole-music play button.
    const play = palette.locator('[data-uiid="playMusic"]');
    await expect(play).toBeVisible({ timeout: 10000 });
    await play.click();

    // ...and the line starts moving.
    const playhead = staff.locator('.cursor.playing');
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

    await page.locator('[data-uiid="paletteExpand"]').click();
    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const palette = page.getByTestId('palette');
    await expect(palette).toBeVisible({ timeout: 10000 });

    const music = palette.locator('[data-uiid="playMusic"]');
    const track = palette.locator('[data-uiid="playTrack"]');
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

    // No code loaded on purpose. The importer sits beside the "+music" offer,
    // and the palette only makes that offer when the program has no output —
    // importing is the other way to get music, not a way to add to some you
    // already have.
    await page.locator('[data-uiid="paletteExpand"]').click();
    const palette = page.getByTestId('palette');
    await expect(palette).toBeVisible({ timeout: 10000 });
    const editor = page.getByTestId('editor').first();

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

    // An import writes two sources: the program that plays the music, and a
    // second one holding the notes. So the program gets a borrow and a
    // `Music(…)` — and, deliberately, none of the notes. The notes' own tile
    // starts collapsed, which is what keeps thousands of them from being laid
    // out before anyone has asked to see them.
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message: 'the import never landed in the program',
            timeout: 60000,
        })
        .toContain('Music');
    const program = (await editor.textContent()) ?? '';
    // ↓ is the borrow. Written literally rather than imported, so this test
    // says what the creator would see in their program.
    expect(program, 'the program should borrow the notes').toContain('↓');
    expect(program, 'the notes belong in the other source').not.toContain(
        'Instrument',
    );

    const elapsed = Date.now() - started;
    expect(
        elapsed,
        `import of 3,200 notes took ${elapsed}ms`,
    ).toBeLessThan(30000);
});
