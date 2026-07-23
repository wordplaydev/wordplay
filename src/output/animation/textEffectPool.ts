import type LanguageCode from '@locale/LanguageCode';
import { getLanguageExemplars } from '@unicode/Exemplars';
import { getCodepoints } from '@unicode/Unicode';

export type ScriptData = {
    /** Single-codepoint letters and digits per ISO 15924 script. */
    pools: Map<string, string[]>;
    /** Codepoint number → ISO 15924 script, for single-codepoint entries. */
    scripts: Map<number, string>;
};

// Derived once from the codepoint database (a cached fetch of codes.txt) the
// first time a random text transition plays.
let data: Promise<ScriptData> | undefined = undefined;

/** The categories worth cycling through: letters and decimal digits. */
const PoolCategories = new Set(['Ll', 'Lu', 'Lt', 'Lo', 'Nd']);

function getScriptData(): Promise<ScriptData> {
    if (data === undefined)
        data = getCodepoints().then((codepoints) => {
            const pools = new Map<string, string[]>();
            const scripts = new Map<number, string>();
            for (const point of codepoints) {
                if (point.hex.length !== 1 || point.script === undefined)
                    continue;
                const codepoint = point.hex[0];
                scripts.set(codepoint, point.script);
                if (PoolCategories.has(point.category)) {
                    const pool = pools.get(point.script);
                    const character = String.fromCodePoint(codepoint);
                    if (pool) pool.push(character);
                    else pools.set(point.script, [character]);
                }
            }
            return { pools, scripts };
        });
    return data;
}

/**
 * When the sample's cased letters are all one case, remove the other case's
 * entries from the pool, so a lowercase text never cycles capitals and vice
 * versa. Mixed-case or caseless samples leave the pool untouched, and a
 * filter that would empty the pool is skipped (an empty pool would freeze the
 * animation).
 */
export function filterPoolByCase(
    sample: string,
    pool: readonly string[],
): readonly string[] {
    const hasLower = /\p{Ll}/u.test(sample);
    const hasUpper = /[\p{Lu}\p{Lt}]/u.test(sample);
    if (hasLower === hasUpper) return pool;
    const drop = hasLower ? /[\p{Lu}\p{Lt}]/u : /\p{Ll}/u;
    const filtered = pool.filter((entry) => !drop.test(entry));
    return filtered.length > 0 ? filtered : pool;
}

/** The script of the most of the text's codepoints, if any have one. */
function getDominantScript(
    text: string,
    scripts: Map<number, string>,
): string | undefined {
    const counts = new Map<string, number>();
    for (const character of text) {
        const codepoint = character.codePointAt(0);
        if (codepoint === undefined) continue;
        const script = scripts.get(codepoint);
        if (script === undefined) continue;
        counts.set(script, (counts.get(script) ?? 0) + 1);
    }
    let dominant: string | undefined = undefined;
    let most = 0;
    for (const [script, count] of counts) {
        if (count > most) {
            most = count;
            dominant = script;
        }
    }
    return dominant;
}

/**
 * Choose the cycling pool for a transition from `start` to `end`: the
 * language's characters win when given and they write the end text's
 * dominant script — so a language implied by the program's locale never
 * cycles the wrong alphabet over foreign text; otherwise the dominant
 * script's whole pool. Either way, the pool is case-filtered against both
 * texts. Pure, so tests can inject data.
 */
export function choosePool(
    start: string,
    end: string,
    languagePool: readonly string[] | undefined,
    scriptData: ScriptData,
): readonly string[] | undefined {
    const dominant = getDominantScript(end, scriptData.scripts);

    let pool: readonly string[] | undefined =
        languagePool !== undefined &&
        (dominant === undefined ||
            languagePool.some(
                (member) =>
                    scriptData.scripts.get(member.codePointAt(0) ?? -1) ===
                    dominant,
            ))
            ? languagePool
            : undefined;

    if (pool === undefined && dominant !== undefined)
        pool = scriptData.pools.get(dominant);

    return pool === undefined
        ? undefined
        : filterPoolByCase(start + end, pool);
}

/**
 * The characters the random text effect cycles through: the characters of the
 * given language (see src/unicode/Exemplars.ts) when it writes the end text's
 * script, otherwise the letters and digits of the end text's dominant script,
 * case-filtered to match the texts. Resolves to undefined when neither
 * applies (e.g. all-emoji text), letting the caller fall back to the texts'
 * own characters.
 */
export async function getRandomPool(
    start: string,
    end: string,
    language: LanguageCode | undefined,
    region: string | undefined,
): Promise<readonly string[] | undefined> {
    const [scriptData, languagePool] = await Promise.all([
        getScriptData(),
        language !== undefined
            ? getLanguageExemplars(language, region)
            : undefined,
    ]);
    return choosePool(start, end, languagePool, scriptData);
}
