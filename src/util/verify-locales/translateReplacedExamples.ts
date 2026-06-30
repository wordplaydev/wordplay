/**
 * One-off surgical localizer for the English `\code\` examples that were substituted into
 * non-en-US locales when repairing broken doc examples. It does NOT run the full translation
 * pipeline: it finds only the examples whose code is still identical to the en-US source (i.e. the
 * English substitutions) and localizes each in place with the project's Claude translation
 * infrastructure ({@link ClaudeTranslator.localizeOneExample}), which keeps the original verbatim
 * if localization fails or would introduce a conflict. Localized doc examples (already native) and
 * 🪲-annotated examples are left untouched.
 *
 * Run per locale, e.g.: `npx tsx src/util/verify-locales/translateReplacedExamples.ts de-DE`
 * (add `--dry` to report without writing). Requires ANTHROPIC_API_KEY (read by the Anthropic SDK).
 */
import { readFileSync, writeFileSync } from 'fs';
import * as prettier from 'prettier';
import { toDocString } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import getDocExamples from '@util/verify-locales/docExamples';
import ClaudeTranslator from '@util/verify-locales/ClaudeTranslator';
import Log from '@util/verify-locales/Log';

const EN_PATH = 'src/locale/en-US.json';

/** Localizes one `\code\`-delimited example to the target locale; returns it (possibly unchanged). */
export type Localizer = (codeWithDelimiters: string) => Promise<string>;

/** Map of doc path -> the set of en-US example codes (used to detect un-localized English examples). */
function enExampleCodes(): Map<string, Set<string>> {
    const en = JSON.parse(readFileSync(EN_PATH, 'utf8'));
    const map = new Map<string, Set<string>>();
    for (const path of getKeyTemplatePairs(en)) {
        if (path.key !== 'doc') continue;
        map.set(
            path.toString(),
            new Set(getDocExamples(toDocString(path.value as any)).map((e) => e.code)),
        );
    }
    return map;
}

export type Result = { localized: number; unchanged: number };

/**
 * Localize every English-substituted example in one locale file. An example qualifies when its code
 * (a) isn't 🪲-annotated and (b) exactly matches an en-US example's code for the same doc path —
 * i.e. it's still English. The localizer returns the (possibly localized) `\code\` text, which is
 * substituted back into the raw doc string. Returns counts; writes the file unless `dry`.
 */
export async function localizeFile(
    file: string,
    localize: Localizer,
    dry: boolean,
): Promise<Result> {
    const en = enExampleCodes();
    const json = JSON.parse(readFileSync(file, 'utf8'));
    const res: Result = { localized: 0, unchanged: 0 };

    for (const path of getKeyTemplatePairs(json)) {
        if (path.key !== 'doc') continue;
        const enCodes = en.get(path.toString());
        if (enCodes === undefined) continue;
        const value = path.value;
        const els = typeof value === 'string' ? [value] : Array.isArray(value) ? value : [];
        const next: (string | unknown)[] = [];
        for (const el of els) {
            if (typeof el !== 'string') {
                next.push(el);
                continue;
            }
            // Right-to-left edits so earlier offsets stay valid.
            const edits: { start: number; end: number; text: string }[] = [];
            let cursor = 0;
            for (const ex of getDocExamples(withoutAnnotations(el))) {
                const idx = el.indexOf(ex.text, cursor);
                if (idx === -1) continue;
                const end = idx + ex.text.length;
                cursor = end;
                if (ex.expectsDefect || !enCodes.has(ex.code)) continue;
                const localized = await localize(ex.text);
                if (localized !== ex.text) {
                    edits.push({ start: idx, end, text: localized });
                    res.localized++;
                } else res.unchanged++;
            }
            let out = el;
            for (const e of edits.sort((a, b) => b.start - a.start))
                out = out.slice(0, e.start) + e.text + out.slice(e.end);
            next.push(out);
        }
        path.repair(json, typeof value === 'string' ? (next[0] as string) : (next as string[]));
    }

    if (!dry)
        writeFileSync(file, await prettier.format(JSON.stringify(json, null, 4), { parser: 'json' }));
    return res;
}

/** CLI entry: `translateReplacedExamples <locale-dir> [--dry]`. */
async function main() {
    const args = process.argv.slice(2);
    const dry = args.includes('--dry');
    const locale = args.find((a) => !a.startsWith('--'));
    if (locale === undefined) {
        console.error('Usage: translateReplacedExamples <locale-dir> [--dry]');
        process.exit(1);
        return;
    }
    const file = `static/locales/${locale}/${locale}.json`;
    const log = new Log(false);
    const translator = new ClaudeTranslator();
    const localizer: Localizer = (code) =>
        translator.localizeOneExample(log, code, 'en-US', locale);
    const res = await localizeFile(file, localizer, dry);
    log.flush();
    console.log(`${locale}: localized=${res.localized} unchanged=${res.unchanged}${dry ? ' (dry)' : ''}`);
}

// Only run as a CLI, not when imported by a test.
if (process.argv[1]?.endsWith('translateReplacedExamples.ts'))
    main().catch((e) => {
        console.error(e);
        process.exit(1);
    });
