import { Revised } from '#locale/Annotations.ts';
import { getLanguageScripts } from '#locale/LanguageCode.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { Script } from '#locale/Scripts.ts';
import { classifyPair } from '#util/verify-locales/classifyLocalePath.ts';
import LocalePath, {
    getKeyTemplatePairs,
} from '#util/verify-locales/LocalePath.ts';
import type Log from '#util/verify-locales/Log.ts';

/**
 * Find translations written in the wrong script.
 *
 * A locale that names its script (#1457) is its language written some other
 * way than usual: Roman Urdu is `ur` in `Latn`. A model asked for it leans
 * back toward the script it has seen the language in most, and nothing else
 * notices — Arabic-script Urdu is valid Urdu, matches the schema and keeps
 * every delimiter. So a string here holding letters of another script its
 * language is written in is asked for again.
 *
 * Only the language's own other scripts count: Roman Urdu quoting a Chinese
 * word is not this mistake, and en-US's own examples carry text in other
 * scripts on purpose, so a string whose English has those letters is skipped.
 */
export default function checkScriptLeak(
    log: Log,
    source: LocaleText,
    target: LocaleText,
    fix: boolean,
): LocaleText {
    if (target.script === undefined) return target;
    const pattern = otherScriptsPattern(target.script, target);
    if (pattern === undefined) return target;
    const revised = fix ? structuredClone(target) : target;

    const leaked: LocalePath[] = [];
    for (const pair of getKeyTemplatePairs(revised)) {
        // `guidance` is the locale's own, and may well discuss the other script.
        if (pair.top()) continue;
        const raw = flatten(pair.value);
        if (raw === undefined) continue;
        // Queued strings are already going to be redone.
        if (raw.startsWith('$?') || raw.startsWith('$!')) continue;
        if (!pattern.test(raw)) continue;
        if (pattern.test(flatten(pair.resolve(source)) ?? '')) continue;
        leaked.push(pair);
    }

    if (leaked.length > 0) {
        log.bad(
            `${leaked.length} string(s) are written partly in a script other than ${target.script}${fix ? `; marking them "${Revised}" queues them for re-translation` : ''}: ${leaked
                .slice(0, 20)
                .map((pair) => pair.toString())
                .join(', ')}`,
        );
        if (fix) for (const pair of leaked) queue(pair, revised);
    }

    return revised;
}

/** Letters of any script the locale's language is written in, other than the
 *  one this locale is written in. Undefined when there are none to look for. */
export function otherScriptsPattern(
    script: Script,
    locale: Pick<LocaleText, 'language'>,
): RegExp | undefined {
    const others = getLanguageScripts(locale.language).filter(
        (other) => other !== script && other !== 'Emoj',
    );
    return others.length === 0
        ? undefined
        : new RegExp(others.map((other) => `\\p{sc=${other}}`).join('|'), 'u');
}

function flatten(value: unknown): string | undefined {
    if (typeof value === 'string') return value.length > 0 ? value : undefined;
    if (Array.isArray(value) && value.every((v) => typeof v === 'string'))
        return value.length > 0 ? value.join('\n\n') : undefined;
    return undefined;
}

/** Replace whatever write-status the value had with `$!`, which keeps the
 *  translation while asking for a new one. A markup array carries its status on
 *  the first element only. */
function queue(pair: LocalePath, revised: LocaleText): void {
    const value = pair.value;
    const mark = (s: string) => Revised + s.replace(/^\$[?!~]/, '');
    pair.repair(
        revised,
        Array.isArray(value)
            ? classifyPair(pair) === 'markup'
                ? value.map((s, index) => (index === 0 ? mark(s) : s))
                : value.map(mark)
            : mark(String(value)),
    );
}
