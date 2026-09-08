import { Sym } from '@nodes/Sym';
import { tokens } from '@parser/Tokenizer';

/**
 * Put back the syntax of a changelog entry's code examples, keeping the names a
 * translation legitimately localized.
 *
 * Localizing an embedded example is right when it renames a definition — a
 * German reader's basis says `Rede()`, not `Speech()` — and wrong when it
 * rewrites anything else. The changelog is where that goes worst, because the
 * entries most likely to carry code are the ones *about* syntax: the entry
 * announcing that a language tag may be written by name shipped as `'hallo'`
 * three times in German, having lost all three tags, and the entry announcing
 * Persian shipped the locale code `fa-AF` as `fa - AF`.
 *
 * That is the same defect CLAUDE.md records for gallery examples — "the lesson
 * without its subject" — arriving in a pipeline that has no `retargetExampleNames`
 * to protect it. This is the cheap protection: deterministic, no model, and it
 * runs on every translation rather than once.
 */

/**
 * A code span's syntax, with names blanked and spacing kept.
 *
 * Names are the one thing a localization may change, so they are the one thing
 * this ignores. Spacing is *not* ignored: `fa-AF` and `fa - AF` tokenize
 * identically and only the spacing says which is the locale code.
 *
 * Null when the span doesn't tokenize, which is itself a reason to restore.
 */
export function codeShape(code: string): string | null {
    try {
        const shape = tokens(code)
            .filter((token) => !token.isSymbol(Sym.End))
            .map((token) =>
                token.isSymbol(Sym.Name) ? 'NAME' : token.getText(),
            )
            .join('');
        return `${shape}${(code.match(/\s/g) ?? []).length}`;
    } catch (_) {
        return null;
    }
}

/**
 * Restore each code span whose syntax the translation changed, span for span.
 *
 * Splitting on the example delimiter is exact here because `mismatchedDelimiter`
 * has already refused any translation whose delimiter count differs from its
 * source — so odd indices are code in both, and they correspond. A mismatch
 * reaching this anyway declines rather than guessing.
 */
export function restoreExampleSyntax(
    english: string,
    translation: string,
): string {
    const source = english.split('\\');
    const target = translation.split('\\');
    if (source.length !== target.length || source.length === 1)
        return translation;
    return target
        .map((part, index) => {
            if (index % 2 === 0) return part;
            const before = source[index] ?? part;
            if (before === part) return part;
            const shape = codeShape(before);
            // Same syntax, different names: the localization did its job.
            return shape !== null && shape === codeShape(part) ? part : before;
        })
        .join('\\');
}
