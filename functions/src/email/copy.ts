import { canonicalOrigin } from '../origin.js';
import { isRecord } from '../shared/guards.js';
import { selectPluralIndex } from './plurals.js';

/**
 * Reading a locale's own words out of the deployed locale JSON.
 *
 * `functions/` cannot import `src/locale/`, and the locale files are served
 * rather than bundled, so copy is fetched. This generalizes what `signinCopy`
 * did for one email: the fetch, the per-field fallback, the 10-minute cache,
 * and the guards that took two bugs to find.
 */

const FetchTimeoutMs = 5000;
const CacheTtlMs = 10 * 60 * 1000;

/** A section of a locale file, whose fields we know nothing about until read. */
export type CopySection = Record<string, unknown>;

/** Strip a write-status marker. `$?` unwritten, `$!` revised, `$~` machine
 *  translated; none of them belongs in an email. */
export function withoutAnnotations(text: string): string {
    return text.replace(/^(\$[?!~])+/, '').trim();
}

const cache = new Map<string, { at: number; locale: CopySection }>();

/** Walk a dotted path through a parsed locale file. */
function at(root: unknown, path: string): CopySection | undefined {
    let here: unknown = root;
    for (const step of path.split('.')) {
        if (!isRecord(here)) return undefined;
        here = here[step];
    }
    return isRecord(here) ? here : undefined;
}

/**
 * A whole locale file, cached per instance. One fetch serves every section, so
 * a decision email that needs both a notice headline and a button label costs
 * one round trip rather than two.
 *
 * `undefined` means "use the compiled-in English", which is also what en-US
 * itself gets: it is bundled into the app rather than served from /locales.
 */
async function localeFile(
    locale: string | undefined,
): Promise<CopySection | undefined> {
    if (locale === undefined || !/^[A-Za-z0-9-]{2,20}$/.test(locale))
        return undefined;
    if (locale === 'en-US') return undefined;
    const cached = cache.get(locale);
    if (cached !== undefined && Date.now() - cached.at < CacheTtlMs)
        return cached.locale;
    try {
        const response = await fetch(
            `${canonicalOrigin()}/locales/${locale}/${locale}.json`,
            { signal: AbortSignal.timeout(FetchTimeoutMs) },
        );
        if (!response.ok) return cached?.locale;
        // Hosting rewrites anything it can't find to the SPA shell — with a
        // 200, so `ok` is true and the body is HTML. Parsing that throws, which
        // is how a missing locale used to look like a rendering error.
        if (
            !(response.headers.get('content-type') ?? '').includes(
                'application/json',
            )
        )
            return cached?.locale;
        const json: unknown = await response.json();
        if (!isRecord(json)) return cached?.locale;
        cache.set(locale, { at: Date.now(), locale: json });
        return json;
    } catch (error) {
        // Stale-on-error rather than failing the send: an unreachable hosting
        // origin must not stop someone being told their work was reported.
        console.error(`Could not read ${locale} copy for an email`, error);
        return cached?.locale;
    }
}

/** One section of one locale, by dotted path, or undefined to fall back. */
export async function emailSection(
    path: string,
    locale: string | undefined,
): Promise<CopySection | undefined> {
    const file = await localeFile(locale);
    return file === undefined ? undefined : at(file, path);
}

/** A nested object inside a section, or undefined to fall back. */
export function subsection(
    section: CopySection | undefined,
    name: string,
): CopySection | undefined {
    const value = section?.[name];
    return isRecord(value) ? value : undefined;
}

/** One field, falling back per field so a partly translated locale still
 *  sends: a half-filled email is worse than an English one. */
export function field(
    section: CopySection | undefined,
    name: string,
    fallback: string,
): string {
    const value = section?.[name];
    if (typeof value !== 'string') return fallback;
    const text = withoutAnnotations(value);
    return text === '' ? fallback : text;
}

/**
 * Fill a template's named inputs.
 *
 * The app does this by parsing markup and concretizing it, which needs the
 * whole language runtime. An email needs far less: the strings it reads are
 * one sentence with one or two named inputs, and `$#count[…|…]` arms. Anything
 * it cannot fill is left as written rather than replaced with the app's
 * "Unparsable template" text, which must never reach a mailbox.
 */
export function substitute(
    template: string,
    inputs: Record<string, string | number>,
    language: string,
): string {
    // Plural arms first: an arm may itself contain `$count`.
    let text = template.replace(
        /\$#([a-zA-Z]+)\[([^\]]*)\]/g,
        (whole, name: string, arms: string) => {
            const value = inputs[name];
            if (typeof value !== 'number') return whole;
            const options = arms.split('|');
            const index = selectPluralIndex(language, value);
            // Clamp: a locale whose string has too few arms degrades to its
            // last form rather than rendering nothing.
            return options[Math.min(index, options.length - 1)] ?? whole;
        },
    );
    // Longest names first, so `$counted` is not eaten by `$count`.
    for (const name of Object.keys(inputs).sort((a, b) => b.length - a.length))
        text = text.split(`$${name}`).join(String(inputs[name]));
    return text;
}

/**
 * Reduce Wordplay markup to the plain text an email shows.
 *
 * Several notice strings are tagged `[formatted]`, so a translator may
 * legitimately write `*bold*` or a link — and a one-line notice headline does
 * not need either. Reducing is what keeps the parser out of `functions/`.
 */
export function toPlainText(markup: string): string {
    return (
        markup
            // A link renders as its label: `<label@url>` and `<url>`.
            .replace(
                /<([^@<>]*)@([^<>]*)>/g,
                (_, label: string, url: string) =>
                    label.trim() === '' ? url : label,
            )
            // Emphasis, extra emphasis, and the light/underline pair.
            .replace(/(\*+|_+|\^+)(.+?)\1/g, '$2')
            // A concept link shows the name it points at.
            .replace(/@([A-Za-z0-9/]+)/g, '$1')
            .replace(/\s+/g, ' ')
            .trim()
    );
}
