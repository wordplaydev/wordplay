import { expect, test, type Page } from '@playwright/test';

/**
 * Reading a bubble aloud (#1015) is only checkable in a browser: it walks the
 * rendered page, and highlights with the CSS Highlight API. The synthesizer is
 * a stand-in, since a headless browser has no voices and the real one reports
 * word boundaries only for some of them; this one is driven by the test.
 */

type Fake = {
    text: string;
    rate: number;
    onend: (() => void) | null;
    onboundary:
        | ((event: {
              name: string;
              charIndex: number;
              charLength: number;
          }) => void)
        | null;
};

/** Install the stand-in synthesizer, reading at the given speed setting. */
async function stubSpeech(page: Page, rate: number) {
    await page.addInitScript((rate) => {
        localStorage.setItem('readAloudRate', JSON.stringify(rate));
        const spoken: Fake[] = [];
        Object.assign(window, {
            __spoken: spoken,
            SpeechSynthesisUtterance: class {
                text: string;
                lang = '';
                rate = 1;
                onend = null;
                onerror = null;
                onboundary = null;
                constructor(text: string) {
                    this.text = text;
                }
            },
        });
        Object.defineProperty(window, 'speechSynthesis', {
            configurable: true,
            value: {
                speak: (utterance: Fake) => {
                    // Priming speaks an empty utterance; it isn't reading.
                    if (utterance.text.length > 0) spoken.push(utterance);
                },
                cancel: () => undefined,
                pause: () => undefined,
                resume: () => undefined,
                getVoices: () => [],
                addEventListener: () => undefined,
            },
        });
    }, rate);
}

/** What has been spoken so far, with the speed it was spoken at. */
function spoken(page: Page) {
    return page.evaluate(() =>
        ((window as unknown as { __spoken: Fake[] }).__spoken ?? []).map(
            (utterance) => utterance.text.trim(),
        ),
    );
}

/** Finish the utterance being spoken, so the next one begins. */
function finishUtterance(page: Page) {
    return page.evaluate(() =>
        (window as unknown as { __spoken: Fake[] }).__spoken.at(-1)?.onend?.(),
    );
}

function highlighted(page: Page, name: string) {
    return page.evaluate((name) => {
        const highlight = CSS.highlights.get(name);
        return highlight === undefined
            ? undefined
            : [...highlight].map((range) => range.toString()).join('');
    }, name);
}

test('a documentation bubble is read aloud, word by word', async ({ page }) => {
    await stubSpeech(page, 1.5);
    await page.goto('/en-US/guide?concept=Phrase');
    const read = page.getByRole('button', { name: 'read this aloud' }).first();
    await read.click({ timeout: 20000 });
    await expect(
        page.getByRole('button', { name: 'stop reading aloud' }),
    ).toHaveCount(1);

    // The first paragraph is spoken, and highlighted while it is.
    await expect
        .poll(() => spoken(page))
        .toContainEqual(
            expect.stringMatching(
                /^I represent the loveliest of Text on Stage/,
            ),
        );
    await expect
        .poll(() => highlighted(page, 'read-aloud-chunk'))
        .toMatch(/^I represent/);

    // At the speed chosen in settings, since no browser exposes the system's.
    expect(
        await page.evaluate(
            () =>
                (window as unknown as { __spoken: Fake[] }).__spoken.at(-1)
                    ?.rate,
        ),
    ).toBe(1.5);

    // A word boundary from the voice highlights that word.
    await page.evaluate(() =>
        (window as unknown as { __spoken: Fake[] }).__spoken
            .at(-1)
            ?.onboundary?.({ name: 'word', charIndex: 2, charLength: 9 }),
    );
    await expect
        .poll(() => highlighted(page, 'read-aloud-word'))
        .toBe('represent');

    // Advancing past the next paragraph reaches the example, which is read as
    // its words rather than its symbols.
    await finishUtterance(page);
    await finishUtterance(page);
    await expect.poll(() => spoken(page)).toContain('Phrase magnificent!');

    // Only what was asked for is spoken: the page's examples, whose output
    // includes a Say, stay silent until their own play control is pressed.
    expect(await spoken(page)).not.toContain('hello!');

    // Stopping silences it and takes the highlight away.
    await page.getByRole('button', { name: 'stop reading aloud' }).click();
    await expect(read).toBeVisible();
    await expect
        .poll(() => highlighted(page, 'read-aloud-chunk'))
        .toBeUndefined();
});

test('an example of a lone symbol is read as what the symbol is', async ({
    page,
}) => {
    // "…written with a condition, then a \?\, then a true expression…", which
    // once read "then a then", the `?`'s keyword word.
    await stubSpeech(page, 1);
    await page.goto('/en-US/learn?tutorial=quick&act=1&scene=2&pause=1');
    await page
        .getByRole('button', { name: 'read this aloud' })
        .first()
        .click({ timeout: 20000 });
    // The line is a few utterances in, after the comparison with Python.
    const line = /then a conditional\s*, then a true expression/;
    await expect
        .poll(async () => {
            const said = await spoken(page);
            if (said.some((text) => line.test(text))) return true;
            await finishUtterance(page);
            return false;
        })
        .toBe(true);
});
