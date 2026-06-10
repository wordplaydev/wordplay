import { expect, test } from '../../playwright/fixtures';
import { createTestProject } from '../helpers/createProject';

/**
 * Text-input coverage for the code editor, centered on #1054 (CJK/IME entry)
 * but also guarding the input paths the fix touches: plain typing, single-
 * composition IMEs (Japanese/Chinese), and recovery from a dropped
 * `compositionend` (the Windows emoji picker).
 *
 * Why synthetic events rather than CDP's `Input.imeSetComposition`: the root
 * cause was an IME-composition `keydown` (`keyCode === 229`) being run as an
 * editor command, and `Input.imeSetComposition` skips the keydown entirely — so
 * a CDP-only test would pass even on the broken code. We replay the real event
 * shape, forcing `keyCode`/`isComposing` via defineProperty because those legacy
 * attributes aren't reliably set through the event constructors.
 *
 * To confirm the Korean case is a real guard, revert the
 * `if (isComposingKeyDown(event)) return;` line in Editor.svelte.handleKeyDown
 * and rebuild: the assertion fails (the editor is left empty).
 */

const KOREAN_WORD = '안녕하세요';
/** 2-Set Korean keys for 안녕하세요, modeled one syllable per composition. */
const KOREAN_SYLLABLES: { key: string; composed: string }[] = [
    { key: 'ㅇ', composed: '안' },
    { key: 'ㄴ', composed: '녕' },
    { key: 'ㅎ', composed: '하' },
    { key: 'ㅅ', composed: '세' },
    { key: 'ㅇ', composed: '요' },
];
const JAPANESE_WORD = '日本語';
const CHINESE_WORD = '你好';
const EMOJI = '😀';

/**
 * Replay one IME composition (a `keyCode: 229` keydown that starts it, then a
 * compositionstart → input → compositionend that commits `composed`). Used both
 * per-syllable (Korean) and once-per-phrase (Japanese/Chinese candidate + Enter
 * commit). Mirrors the real Chromium event stream.
 */
async function composeOnce(
    page: import('@playwright/test').Page,
    key: string,
    composed: string,
) {
    await page.evaluate(
        ({ key, composed }) => {
            const ta = document.querySelector<HTMLTextAreaElement>(
                'textarea.keyboard-input',
            );
            if (ta === null) throw new Error('keyboard-input textarea missing');
            ta.focus();

            // The composition-initiating keydown. keyCode 229 is the signal the
            // fix keys off; isComposing is false here, as it is on real
            // composition-initial keydowns.
            const down = new KeyboardEvent('keydown', {
                key,
                bubbles: true,
                cancelable: true,
            });
            Object.defineProperty(down, 'keyCode', {
                value: 229,
                configurable: true,
            });
            ta.dispatchEvent(down);

            ta.dispatchEvent(
                new CompositionEvent('compositionstart', {
                    bubbles: true,
                    data: '',
                }),
            );

            // The IME writes the composed text into the textarea; the input
            // event must report isComposing so the editor doesn't treat it as a
            // committed keystroke.
            ta.value = composed;
            const input = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                inputType: 'insertCompositionText',
                data: composed,
            });
            Object.defineProperty(input, 'isComposing', {
                value: true,
                configurable: true,
            });
            ta.dispatchEvent(input);

            // Commit. handleCompositionEnd inserts the textarea's value.
            ta.dispatchEvent(
                new CompositionEvent('compositionend', {
                    bubbles: true,
                    data: composed,
                }),
            );
        },
        { key, composed },
    );
    // Yield so Svelte flushes between compositions, matching the real
    // one-macrotask-per-commit cadence.
    await page.waitForTimeout(50);
}

/**
 * Open a fresh project and return an empty, warmed-up editor. We clear the
 * new-project template (real keystrokes, which also warm up caret/CRDT init)
 * and run one throwaway composition: a real IME builds its first syllable over
 * several keydowns, but our one-shot synthetic version makes the very first
 * commit degenerate and it's dropped — priming makes every later composition
 * land. The throwaway is then cleared so each test starts from empty.
 */
async function openWarmEmptyEditor(page: import('@playwright/test').Page) {
    await createTestProject(page);
    const editor = page.getByTestId('editor').first();
    await editor.waitFor();
    await page.locator('textarea.keyboard-input').first().focus();
    await page.waitForTimeout(300);

    const clearAll = async () => {
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Backspace');
    };

    await clearAll();
    await expect(editor).not.toContainText('Welcome', { timeout: 5000 });
    await composeOnce(page, 'ㄱ', '가'); // prime (this first composition is the dropped one)
    await clearAll();
    await page.waitForTimeout(200);
    return editor;
}

test('Latin typing inserts characters', async ({ page }) => {
    const editor = await openWarmEmptyEditor(page);
    await page.keyboard.type('hello');
    await expect(editor).toContainText('hello', { timeout: 10_000 });
});

test('Korean IME composition accumulates syllables (#1054)', async ({
    page,
}) => {
    const editor = await openWarmEmptyEditor(page);
    for (const { key, composed } of KOREAN_SYLLABLES)
        await composeOnce(page, key, composed);
    // The overwrite bug drops every syllable but the last, so the full word
    // never appears as a contiguous run — `요` alone would fail this.
    await expect(editor).toContainText(KOREAN_WORD, { timeout: 10_000 });
});

test('Japanese IME single-composition commit', async ({ page }) => {
    const editor = await openWarmEmptyEditor(page);
    // Japanese commits the whole phrase in one composition (romaji → convert →
    // Enter), so a single composition carries the committed kanji.
    await composeOnce(page, 'n', JAPANESE_WORD);
    await expect(editor).toContainText(JAPANESE_WORD, { timeout: 10_000 });
});

test('Chinese IME single-composition commit', async ({ page }) => {
    const editor = await openWarmEmptyEditor(page);
    // Pinyin → candidate selection commits the whole phrase in one composition.
    await composeOnce(page, 'n', CHINESE_WORD);
    await expect(editor).toContainText(CHINESE_WORD, { timeout: 10_000 });
});

test('Stuck composition (emoji picker) recovers on next keystroke', async ({
    page,
}) => {
    const editor = await openWarmEmptyEditor(page);

    // The Windows emoji picker fires compositionstart and inserts the emoji but
    // drops compositionend, leaving us stuck composing. The next real key (here
    // ArrowLeft, keyCode 37 — not an IME key) must end the composition and commit
    // the emoji. This exercises the handleKeyDown recovery guard and confirms the
    // keyCode-229 exclusion doesn't swallow a real key.
    await page.evaluate((emoji) => {
        const ta = document.querySelector<HTMLTextAreaElement>(
            'textarea.keyboard-input',
        );
        if (ta === null) throw new Error('keyboard-input textarea missing');
        ta.focus();
        ta.dispatchEvent(
            new CompositionEvent('compositionstart', {
                bubbles: true,
                data: '',
            }),
        );
        ta.value = emoji; // emoji inserted, but no compositionend follows
        const down = new KeyboardEvent('keydown', {
            key: 'ArrowLeft',
            bubbles: true,
            cancelable: true,
        });
        Object.defineProperty(down, 'keyCode', {
            value: 37,
            configurable: true,
        });
        ta.dispatchEvent(down);
    }, EMOJI);
    await page.waitForTimeout(100);

    await expect(editor).toContainText(EMOJI, { timeout: 10_000 });
});
