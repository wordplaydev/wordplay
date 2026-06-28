import ClaudeTranslator from './ClaudeTranslator';
import GoogleTranslator from './GoogleTranslator';
import type Translator from './Translator';

/**
 * Select the active translation backend from `WORDPLAY_TRANSLATOR`. The choice is
 * always explicit — there is no silent default, so a long translation run can't
 * quietly use the wrong backend:
 *
 *  - `claude` — Claude (requires `ANTHROPIC_API_KEY`); errors if the key is missing.
 *  - `google` — Google Translate v2.
 *  - `auto`   — an explicit fallback: Claude when `ANTHROPIC_API_KEY` is set,
 *               otherwise Google. (start.ts reports which one it resolved to.)
 *
 * Anything else (including unset) throws, so the caller must choose.
 */
export default function getTranslator(): Translator {
    const choice = process.env.WORDPLAY_TRANSLATOR;
    switch (choice) {
        case 'google':
            return new GoogleTranslator();
        case 'claude':
            if (!process.env.ANTHROPIC_API_KEY)
                throw new Error(
                    'WORDPLAY_TRANSLATOR=claude, but ANTHROPIC_API_KEY is not set. Set the key, or use WORDPLAY_TRANSLATOR=google or =auto.',
                );
            return new ClaudeTranslator();
        case 'auto':
            return process.env.ANTHROPIC_API_KEY
                ? new ClaudeTranslator()
                : new GoogleTranslator();
        default:
            throw new Error(
                `Set WORDPLAY_TRANSLATOR to choose a translation backend: "claude", "google", or "auto" ("auto" uses Claude when ANTHROPIC_API_KEY is set, otherwise Google).`,
            );
    }
}
