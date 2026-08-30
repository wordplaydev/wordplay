import { Revised, Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { classifyPair } from '@util/verify-locales/classifyLocalePath';
import { splitMarkupAndCode } from '@util/verify-locales/protect';
import LocalePath, {
    getKeyTemplatePairs,
} from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';

/**
 * Find strings a locale never translated and never claimed to.
 *
 * `translationEcho.test.ts` asks whether a `$~` claim is true; this asks the
 * opposite question, about the strings nobody claims anything about. A value
 * byte-identical to its en-US source with **no** write-status annotation reads
 * to every other tool as hand-written English, so the verifier doesn't count it
 * unwritten and the translator never queues it. Three strings sat in that state
 * in all 29 locales — `ui.widget.color.pick.tip`, `ui.howto.viewer.view.tip`,
 * and `ui.dialog.share.mode.preview.tips` — since the day each was added.
 *
 * "Still English" is only evidence when the string is *prose*, so the test is
 * narrow on purpose: two or more ASCII words, no `$` template input (a template
 * is identical everywhere by design), and never a `name` path (an operator, an
 * emoji, or a symbol a locale rightly shares with en-US — `checkRedundantNames`
 * owns those). Across all 29 locales that leaves six paths, two of which are
 * exempt below. The repair is `$?` plus the English, which is what the string
 * already is, said out loud so a translate run picks it up.
 *
 * It asks the same question a second way, of strings that *do* carry `$!`. That
 * marker means "there is a translation here and it has gone stale", so nothing
 * treats it as an error — but a `$!` whose value is still byte-for-byte the
 * English is not stale, it is **stuck**: every run picks it up, fails, and
 * re-queues it, and English ships under a marker that says someone is on it.
 * Two had been going round that loop for releases. Which of two things is wrong
 * decides how loudly to say so:
 *
 * - The string has text a translator could be given, so a run *should* have
 *   fixed it and something is broken. That is an error, like `$?` is.
 * - The string has nothing translatable — every segment is code. `¶…¶` prose
 *   inside a `\…\` example is the case that exists today: `splitMarkupAndCode`
 *   classifies the whole example as code, so the doc inside it is never offered
 *   and the marker can never clear. Nobody can fix that in a locale file, so it
 *   warns and names the reason rather than reddening a build over it.
 */

/** Paths whose value is identical to en-US on purpose. Listed rather than
 *  inferred, each with its reason, the way `pluralDeclarations.test.ts` lists
 *  its count-without-noun strings. */
const IdenticalOnPurpose: Record<string, string> = {
    // A font family name, not prose: the face is called "Noto Sans" in every
    // language, and translating it would name a font that isn't loaded.
    'ui.font.app': 'a font family name',
    'ui.font.code': 'a font family name',
};

export default function checkUntranslated(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    const revised = fix
        ? (JSON.parse(JSON.stringify(target)) as LocaleText)
        : target;

    const untranslated: string[] = [];
    /** Marked `$!`, still English, and translatable — a run should have fixed it. */
    const stuck: string[] = [];
    /** Marked `$!`, still English, and nothing in it can be offered anyway. */
    const untranslatable: string[] = [];
    // `getKeyTemplatePairs` rather than `getCheckableLocalePairs`, which lives in
    // `verifyLocale` and would make this an import cycle. `pair.top()` covers
    // everything the latter excludes that could hold prose (`guidance`), and the
    // prose test below covers the rest.
    for (const pair of getKeyTemplatePairs(revised)) {
        const path = pair.toString();
        if (pair.top()) continue;
        if (path in IdenticalOnPurpose) continue;
        // A name a locale shares with en-US is checkRedundantNames' business,
        // and is often a symbol or emoji no locale should translate.
        if (classifyPair(pair) === 'name') continue;

        const raw = flatten(pair.value);
        if (raw === undefined) continue;
        const english = flatten(pair.resolve(source));
        if (english === undefined) continue;
        // Compare without the marker, so a claimed string is still comparable.
        const marker = /^\$[?!~]/.exec(raw)?.[0];
        const value = marker === undefined ? raw : raw.slice(marker.length);
        if (value !== english) continue;
        // A template is identical in every locale by construction.
        if (value.includes('$')) continue;
        // Prose, not a label, a code, or a symbol.
        if (!/[A-Za-z]+\s+[A-Za-z]+/.test(value)) continue;

        if (marker === undefined) {
            untranslated.push(`${path} ("${value.slice(0, 40)}")`);
            if (fix) queue(pair, revised);
        } else if (marker === Revised) {
            (translatable(value) ? stuck : untranslatable).push(
                `${path} ("${value.slice(0, 40)}")`,
            );
        }
        // `$?` is queued and will be picked up; a false `$~` claim is
        // translationEcho.test.ts's business.
    }

    if (untranslated.length > 0)
        log.bad(
            `${untranslated.length} string(s) are still the English and carry no write status, so nothing will ever translate them; marking them "${Unwritten}" queues them: ${bound(untranslated)}`,
        );

    if (stuck.length > 0)
        log.bad(
            `${stuck.length} string(s) are marked "${Revised}" but are still the English, so a translate run is failing on them every time and English is shipping: ${bound(stuck)}`,
        );

    if (untranslatable.length > 0)
        log.warning(
            `${untranslatable.length} string(s) are marked "${Revised}" and are still the English, but hold nothing a translator can be given — prose inside a \\…\\ example is classified as code — so no run can clear them and a person has to: ${bound(untranslatable)}`,
        );

    return revised;
}

/** Whether any of this has text a translator could be handed. A value that is
 *  all code has nothing to offer, so a marker on it can never clear. */
function translatable(value: string): boolean {
    return splitMarkupAndCode(value).some(
        (segment) => segment.kind === 'markup' && segment.text.trim() !== '',
    );
}

/** Bounded: a locale that was never translated would print thousands of paths. */
function bound(paths: string[]): string {
    const listed = paths.slice(0, 20);
    const rest = paths.length - listed.length;
    return `${listed.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}`;
}

/** One comparable string for a value, or undefined if it holds no text. An
 *  array is joined rather than compared element-wise: the question is whether
 *  the whole value was ever translated. */
function flatten(value: unknown): string | undefined {
    if (typeof value === 'string') return value.length > 0 ? value : undefined;
    if (Array.isArray(value) && value.every((v) => typeof v === 'string'))
        return value.length > 0 ? value.join(' ') : undefined;
    return undefined;
}

/** Mark the value unwritten. A markup array carries its status on the first
 *  element only; every other array is positional, so each element is its own
 *  string. */
function queue(pair: LocalePath, revised: LocaleText): void {
    const value = pair.value;
    pair.repair(
        revised,
        Array.isArray(value)
            ? classifyPair(pair) === 'markup'
                ? value.map((s, index) => (index === 0 ? Unwritten + s : s))
                : value.map((s) => Unwritten + s)
            : Unwritten + String(value),
    );
}
