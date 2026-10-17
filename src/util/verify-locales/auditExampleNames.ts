/**
 * Lists every built-in name that `retargetExampleNames` renames from its en-US spelling to
 * the locale's own word (#1465), per locale, with the locale path that declares the word.
 *
 * Renaming an example's `Color.lighter` to de-DE's word writes de-DE's choice of word into
 * code a learner reads, and some of those choices are mistranslations English was hiding
 * (`Feuerzeug`, a cigarette lighter). This is how to see them before they land. With
 * `--review`, each locale's distinct words go to the repair model, which flags the ones that
 * look wrong; word choice is then fixed by hand at the locale path, never automatically.
 *
 * Read-only over the corpus. Writes `example-names.json` (and `example-names-review.json`
 * under `--review`) to the directory given.
 *
 *   npx tsx src/util/verify-locales/auditExampleNames.ts <out-dir> [--review] [locale…]
 */

// Before anything reads the environment: the review's API key comes from .env.
import '#util/verify-locales/loadEnv.ts';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import type LocaleText from '#locale/LocaleText.ts';
import { withoutAnnotations } from '#locale/withoutAnnotations.ts';
import type Tutorial from '../../tutorial/Tutorial';
import { TutorialModes } from '../../tutorial/TutorialMode';
import { parseSerializedProject } from '../../examples/examples';
import { getLocalePath } from '#util/verify-locales/LocaleSchema.ts';
import {
    getDefaultTutorial,
    getTutorialPath,
} from '#util/verify-locales/TutorialSchema.ts';
import { getCheckableLocalePairs } from '#util/verify-locales/verifyLocale.ts';
import {
    ExamplesRoot,
    localizedExamplesPath,
} from '#util/verify-locales/verifyExamples.ts';
import {
    retargetExamplesIn,
    retargetExamplesInDocument,
    retargetSerializedExample,
    retargetTutorialExamples,
    type EnglishRenameObserver,
} from '#util/verify-locales/retargetExampleNames.ts';
import { estimateCost } from '#util/verify-locales/ClaudeTranslator.ts';

type Pair = {
    from: string;
    to: string;
    /** How many examples spell it. */
    count: number;
    /** Where those examples live, for a reader checking one. */
    where: string[];
    /** The locale paths declaring `to` where en-US declares `from`. */
    paths: string[];
    /** The first sentence of en-US's documentation for the definition, if found. */
    doc: string | undefined;
};

function read<T>(file: string): T | undefined {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return undefined;
    }
}

const args = process.argv.slice(2);
const outDir = args.find((arg) => !arg.startsWith('-'));
const review = args.includes('--review');
const only = args.filter((arg) => !arg.startsWith('-') && arg !== outDir);
if (outDir === undefined) {
    console.error('Usage: auditExampleNames.ts <out-dir> [--review] [locale…]');
    process.exit(1);
}

const English = read<LocaleText>(getLocalePath('en-US'));
if (English === undefined) throw new Error('No assembled en-US locale.');

const Locales = fs
    .readdirSync(path.join('static', 'locales'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'en-US')
    .map((entry) => entry.name)
    .filter((code) => only.length === 0 || only.includes(code));

const HowDir = path.join('static', 'locales', 'en-US', 'how');
const HowTos = fs.readdirSync(HowDir).filter((name) => name.endsWith('.txt'));

/** A value's names, as a locale file spells them, without write status. */
function namesAt(value: unknown): string[] {
    const list = Array.isArray(value) ? value : [value];
    return list
        .filter((name): name is string => typeof name === 'string')
        .map((name) => withoutAnnotations(name));
}

/** Every path where the locale declares `to` and en-US declares `from` at the same place. */
function findPaths(
    english: unknown,
    localized: unknown,
    from: string,
    to: string,
    at: string[] = [],
): string[][] {
    if (
        typeof localized === 'string' ||
        (Array.isArray(localized) &&
            localized.every((item) => typeof item === 'string'))
    )
        return namesAt(localized).includes(to) &&
            namesAt(english).includes(from)
            ? [at]
            : [];
    if (typeof localized !== 'object' || localized === null) return [];
    if (typeof english !== 'object' || english === null) return [];
    return Object.entries(localized).flatMap(([key, value]) =>
        findPaths(Reflect.get(english, key), value, from, to, [...at, key]),
    );
}

function valueAt(root: unknown, at: string[]): unknown {
    let value = root;
    for (const key of at) {
        if (typeof value !== 'object' || value === null) return undefined;
        value = Reflect.get(value, key);
    }
    return value;
}

/** The first sentence of the en-US `doc` beside a name, which is what the word must mean. */
function docFor(at: string[]): string | undefined {
    const doc = valueAt(English, [...at.slice(0, -1), 'doc']);
    const text = Array.isArray(doc) ? doc[0] : doc;
    if (typeof text !== 'string') return undefined;
    const plain = withoutAnnotations(text).replace(/\s+/g, ' ').trim();
    return plain.split(/(?<=[.!?])\s/)[0];
}

function audit(code: string): Pair[] {
    const locale = read<LocaleText>(getLocalePath(code));
    if (locale === undefined || English === undefined) return [];
    const pairs = new Map<string, Pair>();
    let where = '';
    const observe: EnglishRenameObserver = ({ from, to }) => {
        const key = `${from}\u0000${to}`;
        const pair = pairs.get(key) ?? {
            from,
            to,
            count: 0,
            where: [],
            paths: [],
            doc: undefined,
        };
        pair.count++;
        if (pair.where.length < 5 && !pair.where.includes(where))
            pair.where.push(where);
        pairs.set(key, pair);
    };

    for (const pair of getCheckableLocalePairs(locale)) {
        const source = pair.resolve(English);
        if (source === undefined) continue;
        const items =
            typeof pair.value === 'string' ? [pair.value] : pair.value;
        if (!items.some((item) => item.includes('\\'))) continue;
        where = pair.toString();
        retargetExamplesInDocument(
            typeof source === 'string' ? [source] : source,
            items,
            locale,
            observe,
        );
    }
    for (const mode of TutorialModes) {
        const tutorial = read<Tutorial>(getTutorialPath(code, mode));
        if (tutorial === undefined) continue;
        where = `${mode} tutorial`;
        retargetTutorialExamples(
            tutorial,
            getDefaultTutorial(mode),
            locale,
            false,
            observe,
        );
    }
    for (const filename of HowTos) {
        const target = path.join('static', 'locales', code, 'how', filename);
        if (!fs.existsSync(target)) continue;
        where = `how/${filename}`;
        retargetExamplesIn(
            fs.readFileSync(path.join(HowDir, filename), 'utf8'),
            fs.readFileSync(target, 'utf8'),
            locale,
            observe,
        );
    }
    const examples = localizedExamplesPath(code);
    if (fs.existsSync(examples))
        for (const filename of fs.readdirSync(examples)) {
            const master = path.join(ExamplesRoot, filename);
            if (!filename.endsWith('.wp') || !fs.existsSync(master)) continue;
            const id = filename.replace('.wp', '');
            where = `examples/${filename}`;
            retargetSerializedExample(
                parseSerializedProject(fs.readFileSync(master, 'utf8'), id)
                    .sources,
                parseSerializedProject(
                    fs.readFileSync(path.join(examples, filename), 'utf8'),
                    id,
                ).sources,
                locale,
                locale.language,
                observe,
            );
        }

    for (const pair of pairs.values()) {
        // A word can also be a label somewhere (`ui.page.design.col.color`), so declared
        // names come first and supply the meaning.
        const found = findPaths(English, locale, pair.from, pair.to).sort(
            (a, b) =>
                Number(b.at(-1) === 'names') - Number(a.at(-1) === 'names'),
        );
        pair.paths = found.map((at) => at.join('.'));
        pair.doc = found.map(docFor).find((doc) => doc !== undefined);
    }
    return [...pairs.values()].sort((a, b) => b.count - a.count);
}

const audited: Record<string, Pair[]> = {};
for (const code of Locales) {
    audited[code] = audit(code);
    const pairs = audited[code];
    console.log(
        `${code}: ${pairs.length} words, ${pairs.reduce((sum, pair) => sum + pair.count, 0)} renames`,
    );
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
    path.join(outDir, 'example-names.json'),
    JSON.stringify(audited, null, 2),
);

/** What the reviewer says about one word. */
const Verdicts = z.object({
    items: z.array(
        z.object({
            index: z.number(),
            verdict: z.enum(['ok', 'suspect']),
            reason: z.string(),
            suggestion: z.string(),
        }),
    ),
});

const ReviewModel = 'claude-opus-5-5';

const System = `You review identifier names in Wordplay, a programming language for interactive typography whose built-in types, functions, and inputs are named in each reader's language. Learners, often children, read these names in code examples.

For each item you get the English name, what it means, and the word one locale uses for it. Mark the word "suspect" only if it is wrong for what the definition means: a different sense of an ambiguous English word (English "lighter" meaning less dark, translated as a cigarette lighter), a false friend, a word for something else entirely, or a word a reader of that language would find confusing or misleading in this role. Mark it "ok" otherwise, including plausible synonyms, stylistic choices you would have made differently, abbreviations the language uses, and loanwords the language commonly uses.

For a suspect word, give a short reason in English and suggest one replacement in the locale's language that is a single identifier with no spaces. For an ok word, leave reason and suggestion empty.`;

const ReviewSchema = {
    type: 'object',
    properties: {
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    index: { type: 'integer' },
                    verdict: { type: 'string', enum: ['ok', 'suspect'] },
                    reason: { type: 'string' },
                    suggestion: { type: 'string' },
                },
                required: ['index', 'verdict', 'reason', 'suggestion'],
                additionalProperties: false,
            },
        },
    },
    required: ['items'],
    additionalProperties: false,
};

if (review) {
    // The SDK reads ANTHROPIC_API_KEY from the environment.
    const client = new Anthropic({ maxRetries: 4, timeout: 600_000 });
    const usage = {
        model: ReviewModel,
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        // Reported inside output_tokens; kept apart only by runs that ask for it.
        thinkingTokens: 0,
    };
    const flagged: Record<
        string,
        (Pair & { reason: string; suggestion: string })[]
    > = {};

    const reviewLocale = async (code: string) => {
        const pairs = audited[code] ?? [];
        if (pairs.length === 0) return;
        const response = await client.messages.create({
            model: ReviewModel,
            max_tokens: 32_000,
            system: System,
            // Stated rather than left to the model's default, so a change of default can't
            // silently change what a review costs.
            output_config: {
                format: { type: 'json_schema', schema: ReviewSchema },
                effort: 'medium',
            },
            messages: [
                {
                    role: 'user',
                    content: `Locale: ${code}\n\n${JSON.stringify(
                        pairs.map((pair, index) => ({
                            index,
                            english: pair.from,
                            meaning: pair.doc ?? '',
                            path: pair.paths[0] ?? '',
                            word: pair.to,
                        })),
                    )}`,
                },
            ],
        });
        usage.requests++;
        usage.inputTokens += response.usage.input_tokens;
        usage.outputTokens += response.usage.output_tokens;
        usage.cacheReadTokens += response.usage.cache_read_input_tokens ?? 0;
        usage.cacheWriteTokens +=
            response.usage.cache_creation_input_tokens ?? 0;
        const text = response.content.find((block) => block.type === 'text');
        const parsed = Verdicts.safeParse(
            text?.type === 'text' ? JSON.parse(text.text) : undefined,
        );
        if (!parsed.success) {
            console.error(
                `${code}: unreadable review (${response.stop_reason})`,
            );
            return;
        }
        flagged[code] = parsed.data.items.flatMap((item) => {
            const pair = pairs[item.index];
            return item.verdict === 'suspect' && pair !== undefined
                ? [
                      {
                          ...pair,
                          reason: item.reason,
                          suggestion: item.suggestion,
                      },
                  ]
                : [];
        });
        console.log(`${code}: ${flagged[code].length} suspect`);
    };

    // A few at a time: each request is one whole locale.
    const queue = [...Locales];
    await Promise.all(
        Array.from({ length: 6 }, async () => {
            for (let code = queue.shift(); code; code = queue.shift())
                await reviewLocale(code).catch((error: unknown) =>
                    console.error(`${code}: ${String(error)}`),
                );
        }),
    );

    fs.writeFileSync(
        path.join(outDir, 'example-names-review.json'),
        JSON.stringify(flagged, null, 2),
    );
    const cost = estimateCost(usage);
    console.log(
        `Review: ${usage.requests} requests, ${usage.inputTokens} in, ${usage.outputTokens} out${cost === undefined ? '' : `, ~$${cost.toFixed(2)}`}`,
    );
}
