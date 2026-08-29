import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';
import { grantClipboard } from '../helpers/clipboard';

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
    await page.evaluate(
        (source) => navigator.clipboard.writeText(source),
        code,
    );
    await page.keyboard.press('ControlOrMeta+v');
    await expect
        .poll(async () => (await editor.textContent()) ?? '', {
            message: 'source did not load into the editor',
        })
        .toContain('Music');
}

test('the playhead appears and advances while previewing', async ({ page }) => {
    test.setTimeout(90000);

    await grantClipboard(page);
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
            (
                await playhead.evaluate((el) => getComputedStyle(el).left)
            ).replace('px', ''),
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

    await grantClipboard(page);
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

test('the other tracks are drawn for reference, and only sound active when they sound', async ({
    page,
}) => {
    test.setTimeout(90000);

    await grantClipboard(page);
    await createTestProject(page);
    // A melody and a short loop under it — the pairing the reference layer
    // exists for. The melody is selected first, since it is track one.
    await loadCode(
        page,
        'Music([Track([1 2 3 4 5 6 7 8] loop: ⊥) Track([1 1] loop: ⊤ instrument: Instrument.drums)] tempo: 60beats/min)',
    );

    await page.locator('[data-uiid="paletteExpand"]').click();
    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const palette = page.getByTestId('palette');
    const staff = palette.locator('.staff');
    await expect(staff).toBeVisible({ timeout: 10000 });

    // The edited track keeps exactly its own eight noteheads...
    const mine = staff.locator('.mark:not(.reference)');
    await expect(mine).toHaveCount(8, { timeout: 10000 });
    // ...and the drum loop repeats across the melody beneath them.
    const reference = staff.locator('.mark.reference');
    await expect(reference.first()).toBeVisible({ timeout: 10000 });
    expect(await reference.count()).toBeGreaterThan(2);

    // Reference notes are there to look at, not to reach: nothing to focus,
    // nothing to click, and nothing for a screen reader to wade through.
    expect(
        await reference.evaluateAll((notes) =>
            notes.every(
                (note) =>
                    note.getAttribute('aria-hidden') === 'true' &&
                    note.tagName !== 'BUTTON' &&
                    getComputedStyle(note).pointerEvents === 'none',
            ),
        ),
        'reference notes should be inert',
    ).toBe(true);

    // Grey while nothing is playing.
    await expect(staff.locator('.mark.reference.active')).toHaveCount(0);

    // Soloing this track leaves the drum grey: it isn't being heard.
    await palette.locator('[data-uiid="playTrack"]').click();
    await expect(staff.locator('.mark.reference.active')).toHaveCount(0, {
        timeout: 5000,
    });
    await palette.locator('[data-uiid="playTrack"]').click();

    // Playing the whole music lights every reference note up, because every
    // one of them is now sounding.
    await palette.locator('[data-uiid="playMusic"]').click();
    const drawn = await reference.count();
    await expect
        .poll(
            async () =>
                (await staff.locator('.mark.reference.active').count()) ===
                drawn,
            { message: 'reference notes did not go active', timeout: 5000 },
        )
        .toBe(true);
});

test('clicking the empty staff after a track adds a note to the end of it', async ({
    page,
}) => {
    test.setTimeout(90000);

    await grantClipboard(page);
    await createTestProject(page);
    // Every note the same, so where the added one lands is unambiguous — it is
    // the only one that won't be a 1.
    await loadCode(page, 'Music(Track([1 1 1 1] loop: ⊥))');

    await page.locator('[data-uiid="paletteExpand"]').click();
    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const staff = page.getByTestId('palette').locator('.staff');
    const notes = staff.locator('.mark:not(.reference)');
    await expect(notes).toHaveCount(4, { timeout: 10000 });

    // A beat to the right of the last notehead: empty staff, unambiguously
    // after the track. This used to insert second to last, because the whole
    // width of the last note read as "before the last note".
    const last = (await notes.last().boundingBox())!;
    const box = (await staff.boundingBox())!;
    await staff.click({
        position: { x: last.x - box.x + 44, y: 20 },
    });

    await expect(notes).toHaveCount(5, { timeout: 10000 });
    // The high note the click placed is last, not second to last. Read from
    // the note list itself; the editor renders zero-width separators between
    // every token, and a line number before them.
    const source = ((await editor.textContent()) ?? '').replace(/​/g, '');
    const list =
        source
            .match(/\[([^\]]*)\]/)?.[1]
            .trim()
            .split(/\s+/) ?? [];
    expect(list, `the track reads ${list.join(' ')}`).toHaveLength(5);
    expect(
        list[list.length - 1],
        `the added note should be last, but the track reads ${list.join(' ')}`,
    ).not.toBe('1');

    // And the note that was added is the one being edited. Focus used to land
    // on the note before it, because the slot was clamped against the list as
    // it was before the edit landed — which also dragged the cursor
    // back to that note, since the focused note is where playing starts.
    const focused = () =>
        page.evaluate(
            () => document.activeElement?.getAttribute('data-note') ?? null,
        );
    await expect.poll(focused, { timeout: 10000 }).toBe('4:0');
    await expect
        .poll(() =>
            staff.evaluate((region) => {
                const line = region.querySelector('.cursor');
                const perBeat = parseFloat(
                    getComputedStyle(region).getPropertyValue('--per-beat'),
                );
                return line === null
                    ? -1
                    : parseFloat(getComputedStyle(line).left) / perBeat;
            }),
        )
        .toBe(4);

    // Deleting it hands focus back to the note before, rather than stranding
    // the staff with no tab stop at all.
    await page.keyboard.press('Backspace');
    await expect(notes).toHaveCount(4, { timeout: 10000 });
    await expect.poll(focused).toBe('3:0');

    // Enter repeats the focused note after it, which is another append.
    await page.keyboard.press('Enter');
    await expect(notes).toHaveCount(5, { timeout: 10000 });
    await expect.poll(focused).toBe('4:0');
});

test('the first note added to an empty track is the one being edited', async ({
    page,
}) => {
    test.setTimeout(90000);

    await grantClipboard(page);
    await createTestProject(page);
    await loadCode(page, 'Music(Track([] loop: ⊥))');

    await page.locator('[data-uiid="paletteExpand"]').click();
    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const staff = page.getByTestId('palette').locator('.staff');
    await expect(staff).toBeVisible({ timeout: 10000 });

    // An empty track had no note to clamp a focus claim to, so the claim was
    // refused and the note a creator had just placed wasn't the one they were
    // editing.
    await staff.click({ position: { x: 120, y: 40 } });
    const focused = () =>
        page.evaluate(
            () => document.activeElement?.getAttribute('data-note') ?? null,
        );
    await expect.poll(focused, { timeout: 10000 }).toBe('0:0');

    // Removing the only note leaves nothing to focus, and says so rather than
    // holding a claim on a note that no longer exists.
    await page.keyboard.press('Backspace');
    await expect(staff.locator('.mark:not(.reference)')).toHaveCount(0, {
        timeout: 10000,
    });
    await expect.poll(focused).toBeNull();
});

test('editing a note leaves the staff scrolled where it was', async ({
    page,
}) => {
    test.setTimeout(90000);

    await grantClipboard(page);
    await createTestProject(page);
    // Long enough to scroll, and a second track to switch to.
    const many = Array.from({ length: 40 }, (_, i) => 1 + (i % 7)).join(' ');
    await loadCode(
        page,
        `Music([Track([${many}] loop: ⊥) Track([1 2] loop: ⊥ instrument: Instrument.bell)])`,
    );

    await page.locator('[data-uiid="paletteExpand"]').click();
    const editor = page.getByTestId('editor').first();
    await editor.getByText('Track', { exact: false }).first().click();

    const palette = page.getByTestId('palette');
    const staff = palette.locator('.staff');
    await expect(staff.locator('.mark').first()).toBeVisible({
        timeout: 10000,
    });
    const scrolled = () => staff.evaluate((region) => region.scrollLeft);

    await staff.evaluate((region) => (region.scrollLeft = 600));
    await expect.poll(scrolled).toBe(600);

    /** Wait for an edit to reach the program, whatever it was. Waiting on the
     * source rather than on the noteheads, which are windowed to what fits. */
    const edited = async (was: string) => {
        await expect
            .poll(async () => (await editor.textContent()) ?? '', {
                message: 'the edit never reached the program',
                timeout: 10000,
            })
            .not.toBe(was);
    };

    // Every edit mints new nodes, and the staff used to read that as a change
    // of track and scroll back to the first note — out from under the hand
    // that was editing.
    let source = (await editor.textContent()) ?? '';
    await staff.click({ position: { x: 200, y: 40 } });
    await edited(source);
    expect(await scrolled(), 'placing a note moved the staff').toBe(600);

    // Same for an edit from the keyboard, which lands on the focused note.
    source = (await editor.textContent()) ?? '';
    await page.keyboard.press('ArrowUp');
    await edited(source);
    expect(await scrolled(), 'transposing a note moved the staff').toBe(600);

    // But a real change of track still shows that track's first note, which is
    // the behavior the identity check was there for.
    await palette.locator('.tracks').first().locator('button').last().click();
    await expect.poll(scrolled).not.toBe(600);
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
        0x4d,
        0x54,
        0x68,
        0x64,
        ...u32(6),
        ...u16(1),
        ...u16(tracks),
        ...u16(480),
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

    await grantClipboard(page);
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
    // Found page-wide by uiid rather than under the palette. The toolbar the
    // importer sits in moves items that don't fit into a popup portaled to
    // <body>, so whether this input is inside the palette at all depends on the
    // window's width; and the toolbar's hidden measurement copy of every item
    // is a second file input inside the palette, which is what made
    // `palette.locator('input[type="file"]')` ambiguous. Only the real input
    // keeps its uiid — the toolbar strips them from the measurement copy.
    await page.locator('[data-uiid="midiPicker"]').setInputFiles({
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
    expect(elapsed, `import of 3,200 notes took ${elapsed}ms`).toBeLessThan(
        30000,
    );
});
