import fs from 'fs';
import path from 'path';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import LocalePath, {
    getKeyTemplatePairs,
} from '@util/verify-locales/LocalePath';

/** The top-level sections of the locale JSON, derived from the default locale
 *  so a newly-added section can never drift out of sync with this analysis (the
 *  cause of past false-positives). We anchor property-chain matches on these so
 *  we don't false-positive every random `obj.x.y` chain in the codebase as a
 *  locale read. */
const TOP_LEVEL_SECTIONS = Object.keys(DefaultLocale);

/** Escape a string for literal use inside a RegExp (e.g. the `$` in `$schema`). */
function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Top-level sections (or sub-trees) whose leaves are accessed via runtime-
 *  computed keys, so static analysis can't see the reads. Anything covered by
 *  one of these prefixes is considered "used" unconditionally. Keep the list
 *  conservative — adding a prefix masks real unused keys under it. */
const ALWAYS_USED_PREFIXES: readonly string[] = [
    // Metadata, not user-visible strings.
    '$schema',
    'language',
    'regions',
    'wordplay',
    // glossary.* is read via getTermByID(id) (@term references) and the glossary
    // UI, with runtime-computed keys, so no static accessor lists individual ids.
    'glossary',
    // token.<TokenName> is mapped from the Sym enum by TokenCategories.
    'token',
    // keyword.<KeywordId> is read dynamically (l.keyword[id]) by TokenView from Keywords.ts.
    'keyword',
    // input.<Type>.* / output.<Type>.* are walked by getInputLocales /
    // getOutputLocales at runtime against the live definition classes.
    'input',
    'output',
];

/** Identifier names that typically reference a locale object. Property chains
 *  starting at one of these and whose first segment is a top-level section are
 *  treated as locale reads. Including identifiers from non-closure call sites
 *  (`parsed`, `fallback` in hooks.server.ts) lets us catch reads that don't
 *  use the `(l) => l.X` accessor pattern. */
const LOCALE_IDENTIFIERS = [
    'l',
    'locale',
    'locales',
    'texts',
    'text',
    'parsed',
    'fallback',
    'defaultLocale',
    'DefaultLocale',
    'localeText',
    'LocaleText',
];

/** Match property chains rooted at a locale-store identifier whose first
 *  segment is a known top-level section. Captures the dotted path starting at
 *  the top-level section (e.g. `node.Block.start`, `ui.source.empty`). Works
 *  for closure bodies, direct references, destructuring, and HTML-template-
 *  adjacent code alike. */
const PROPERTY_CHAIN_PATTERN = new RegExp(
    `\\b(?:${LOCALE_IDENTIFIERS.join('|')})\\??\\.((?:${TOP_LEVEL_SECTIONS.map(escapeRegExp).join('|')})(?:\\??\\.[\\w$]+)*)`,
    'g',
);

/** Match HTML-template substitution like `%wordplay.system.noscript%` in
 *  app.html and similar templates. Captures the dotted path after `wordplay.`. */
const HTML_TEMPLATE_PATTERN = /%wordplay\.([\w$]+(?:\.[\w$]+)*)%/g;

/** Walk a directory and yield every .ts/.svelte/.html file under it. */
function* walkSource(root: string): Generator<string> {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(root, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.'))
                continue;
            yield* walkSource(full);
        } else if (entry.isFile()) {
            if (
                entry.name.endsWith('.ts') ||
                entry.name.endsWith('.svelte') ||
                entry.name.endsWith('.html')
            )
                yield full;
        }
    }
}

/** Collect every used locale path prefix referenced in `sources`. Each entry
 *  is a dotted path like `node.Block` or `ui.source.empty`; a leaf is used if
 *  any ancestor (or itself) appears in this set. */
export function collectUsedPrefixes(sources: Iterable<string>): Set<string> {
    const used = new Set<string>();
    for (const text of sources) {
        for (const match of text.matchAll(PROPERTY_CHAIN_PATTERN)) {
            // Optional-chaining tokens (`?.`) end up inside the capture; strip
            // them so `node?.Block` and `node.Block` collapse to the same key.
            used.add(match[1].replace(/\?\./g, '.'));
        }
        for (const match of text.matchAll(HTML_TEMPLATE_PATTERN))
            used.add(match[1]);
    }
    return used;
}

/** A leaf path is used if any of its prefixes (or the leaf itself) is in the
 *  collected used-prefix set, or if it falls under an always-used section. */
function isLeafUsed(leafPath: string, usedPrefixes: Set<string>): boolean {
    // LocalePath.toString() emits `.key` for top-level leaves; normalize.
    const cleaned = leafPath.startsWith('.') ? leafPath.slice(1) : leafPath;
    for (const prefix of ALWAYS_USED_PREFIXES) {
        if (cleaned === prefix || cleaned.startsWith(prefix + '.')) return true;
    }
    let prefix = '';
    for (const segment of cleaned.split('.')) {
        prefix = prefix === '' ? segment : `${prefix}.${segment}`;
        if (usedPrefixes.has(prefix)) return true;
    }
    return false;
}

/** Return the leaf paths in `locale` that no static accessor under
 *  `sourceRoot` references. Always-used sections are skipped automatically.
 *  This is best-effort static analysis — see ALWAYS_USED_PREFIXES for the
 *  known dynamic-access escape hatches. */
export function findUnusedKeys(
    locale: LocaleText,
    sourceRoot: string,
): LocalePath[] {
    const sources: string[] = [];
    for (const file of walkSource(sourceRoot)) {
        sources.push(fs.readFileSync(file, 'utf8'));
    }
    const usedPrefixes = collectUsedPrefixes(sources);
    const leaves = getKeyTemplatePairs(
        locale as unknown as Record<string, unknown>,
    );
    return leaves.filter((leaf) => !isLeafUsed(leaf.toString(), usedPrefixes));
}
