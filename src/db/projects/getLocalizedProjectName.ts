/**
 * Multilingual project names (issue #456).
 *
 * `Project.data.name` is a plain string in storage, but creators may
 * optionally write Wordplay TextLiteral syntax in that field —
 * e.g. `"project"/en"projecto"/es`. When we display a project name we
 * try to parse the string; if it's a TextLiteral with language tags,
 * we pick the translation matching the current locale (via the same
 * `getPreferred(...)` ladder all other language-tagged nodes use).
 * Otherwise we render the raw string unchanged.
 *
 * Validation (used by the project-name TextField) returns either `true`
 * for valid input or a locale-text accessor for the inline error hint —
 * the field doesn't block saving on invalid input, since mid-typing
 * states are necessarily transiently broken.
 */

import type Project from '@db/projects/Project';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type { LocaleTextAccessor } from '@locale/Locales';
import TextLiteral from '@nodes/TextLiteral';
import { toExpression } from '@parser/parseExpression';
import { TextCloseByTextOpen } from '@parser/Tokenizer';

/** Set of opening text delimiters that signal "this name might be a
 *  TextLiteral and should be parsed before display." Keeps us from
 *  accidentally localizing a plain name like `Adventure` that happens
 *  to parse as some other expression. */
const TextOpenDelimiters = new Set(Object.keys(TextCloseByTextOpen));

/**
 * Parse a name string as a multilingual `TextLiteral`, or return
 * `undefined` if it isn't one. A name is treated as multilingual only
 * when it (a) starts with a text delimiter, (b) parses to a TextLiteral
 * whose every `Translation` has a `language` tag, and (c) round-trips
 * through `toWordplay()` byte-for-byte — that last check catches
 * trailing garbage and unbalanced quotes (the parser is fault-tolerant
 * and produces partial trees on bad input).
 */
export function parseAsMultilingualName(raw: string): TextLiteral | undefined {
    if (raw.length === 0) return undefined;
    if (!TextOpenDelimiters.has(raw[0])) return undefined;
    let expr;
    try {
        expr = toExpression(raw);
    } catch {
        return undefined;
    }
    if (!(expr instanceof TextLiteral)) return undefined;
    // Require at least one language tag — a bare `"hello"` is not a
    // multilingual name, just a quoted plain name, and should render raw.
    if (!expr.texts.every((t) => t.language !== undefined)) return undefined;
    // Every Translation must have closed cleanly; otherwise the parser
    // recovered from an unterminated string and the source is broken.
    if (!expr.texts.every((t) => t.close !== undefined)) return undefined;
    // Round-trip check catches trailing garbage and embedded
    // UnparsableExpression nodes.
    if (expr.toWordplay() !== raw) return undefined;
    return expr;
}

/**
 * The user-facing name for a project: the best-matching translation for
 * the current locale if the name is multilingual, otherwise the raw
 * string. Plain names round-trip unchanged.
 */
export function getLocalizedProjectName(
    project: Project,
    locales: Locales,
): string {
    const raw = project.getName();
    if (raw.length === 0) return '';
    const parsed = parseAsMultilingualName(raw);
    if (!parsed) return raw;
    return parsed.getLocaleText(locales.getLocales()).getText();
}

/**
 * How many language-tagged names a project name holds: the translation
 * count for a well-formed multilingual literal, else 1 for a non-empty
 * plain name, 0 for empty. Drives whether the footer shows an edit toggle.
 */
export function getProjectNameCount(raw: string): number {
    if (raw.length === 0) return 0;
    return parseAsMultilingualName(raw)?.texts.length ?? 1;
}

/**
 * Inline-feedback validator for the project-name TextField. Returns
 * `true` for plain names (any string that doesn't look like a
 * TextLiteral) and well-formed multilingual TextLiterals; returns an
 * error accessor for input that *looks like* it tried to be a
 * TextLiteral but doesn't parse cleanly.
 */
export function validateProjectName(name: string): true | LocaleTextAccessor {
    if (name.length === 0) return true;
    if (!TextOpenDelimiters.has(name[0])) return true;
    if (parseAsMultilingualName(name) !== undefined) return true;
    return (l: LocaleText) => l.ui.project.field.name.invalid;
}
