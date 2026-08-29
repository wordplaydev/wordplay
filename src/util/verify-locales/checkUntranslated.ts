import { Unwritten } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { classifyPair } from '@util/verify-locales/classifyLocalePath';
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

        const value = flatten(pair.value);
        if (value === undefined) continue;
        if (value !== flatten(pair.resolve(source))) continue;
        // Already claimed as unwritten, revised, or machine translated.
        if (/^\$[?!~]/.test(value)) continue;
        // A template is identical in every locale by construction.
        if (value.includes('$')) continue;
        // Prose, not a label, a code, or a symbol.
        if (!/[A-Za-z]+\s+[A-Za-z]+/.test(value)) continue;

        untranslated.push(`${path} ("${value.slice(0, 40)}")`);
        if (fix) queue(pair, revised);
    }

    if (untranslated.length > 0) {
        // Bounded: a locale that has never been translated at all would
        // otherwise print one line thousands of paths long.
        const listed = untranslated.slice(0, 20);
        const rest = untranslated.length - listed.length;
        log.bad(
            `${untranslated.length} string(s) are still the English and carry no write status, so nothing will ever translate them; marking them "${Unwritten}" queues them: ${listed.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}`,
        );
    }

    return revised;
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
