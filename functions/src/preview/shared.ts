/**
 * Pure logic shared by the page-preview and sitemap functions (#1133).
 *
 * This module must stay dependency-free: it is compiled by the functions
 * tsconfig for deployment AND imported directly by the root test suite
 * (src/examples/previewShared.test.ts, src/examples/exampleManifestSync.test.ts),
 * which runs it under the app's tsconfig. The example manifest below duplicates
 * data from src/examples/examples.ts and src/locale/en-US.json on purpose —
 * functions/ cannot import src/ — and the sync test fails `npm test` if they
 * drift.
 */

/** Mirrors ExamplePrefix in src/examples/examples.ts. */
export const ExamplePrefix = 'example-';

export type ExampleGalleryInfo = {
    /** The key under `gallery` in each locale's JSON file. */
    localeKey: string;
    /** en-US name/description fallbacks; en-US.json is not served as a static asset. */
    name: string;
    description: string;
    /** Example project names; ids are ExamplePrefix + name. */
    projects: string[];
};

export const ExampleGalleries: Record<string, ExampleGalleryInfo> = {
    Games: {
        localeKey: 'games',
        name: 'Games',
        description: 'Interactive games with words and symbols.',
        projects: [
            'HeartAttack',
            'ShowAndTell',
            'BuildingBlocks',
            'Adventure',
            'BasketballStar',
            'HummingBird',
            'Maze',
            'WhatWord',
            'Catch',
            'Madlib',
            'WheresWaldough',
            'KatakanaGuess',
            'FrenchNumbers',
        ],
    },
    Visualizations: {
        localeKey: 'visualizations',
        name: 'Visualizations',
        description: 'Visualizations of and via text.',
        projects: [
            'Amplitude',
            'PointerTrail',
            'CodeGap',
            'Garden',
            'Letters',
            'Poem',
            'Questions',
            'RainingKitties',
            'RotatingBinary',
            'FontMachine',
            'Pumpkin',
            'Size',
            'FloatingFoods',
            'AnimatedName',
            'WordplayTrace',
        ],
    },
    Motion: {
        localeKey: 'motion',
        name: 'Motion',
        description: 'Examples of movement and collisions.',
        projects: [
            'Hira',
            'Layers',
            'Chamber',
            'Orbits',
            'Pounce',
            'FootBall',
            'Christmas',
            'Easing',
            'Echo',
        ],
    },
    Music: {
        localeKey: 'music',
        name: 'Music',
        description:
            'Songs, instruments, and typography that moves to the beat.',
        projects: [
            'Instruments',
            'Birthday',
            'Conductor',
            'RowYourBoat',
            'CatScat',
            'Chimes',
            'Fireworks',
            'Lyrics',
            'VirtualPiano',
        ],
    },
    AV: {
        localeKey: 'av',
        name: 'Audio/Video',
        description:
            'Using volume, pitch, and video as input, and speech as output.',
        projects: [
            'Listen',
            'Talk',
            'SpokenWords',
            'RainingLetters',
            'Video',
            'PitchNotes',
            'Hand',
            'Face',
            'FaceTalk',
        ],
    },
    Stories: {
        localeKey: 'stories',
        name: 'Stories',
        description: 'Interactive stories and narratives.',
        projects: [
            'Pears',
            'Dialog',
            'JapaneseClass',
            'PersonalMap',
            'SlideShow',
        ],
    },
    Tools: {
        localeKey: 'tools',
        name: 'Tools',
        description: 'Simple utilities and applications.',
        projects: [
            'Calculator',
            'Clock',
            'Literacy',
            'Timer',
            'Headlines',
            'SentenceLength',
            'StudyModeMeter',
            'Patterns',
            'Chatterbox',
        ],
    },
};

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Mirrors src/locale/withoutAnnotations.ts (markers from src/locale/Annotations.ts). */
export function withoutAnnotations(text: string): string {
    return text
        .replace(/\$\?/g, '')
        .replace(/\$!/g, '')
        .replace(/\$~/g, '')
        .trim();
}

export type PreviewTarget = {
    kind: 'project' | 'gallery';
    id: string;
    /** Locales from the URL's optional `+`-joined locale segment, e.g. ['en-US','es-MX']. */
    locales: string[];
};

/**
 * Parse a `/project/<id>`, `/gallery/<id>`, or locale-prefixed variant.
 * Returns undefined for anything else, in which case the caller serves the
 * shell untouched — the hosting rewrite regex should make that unreachable,
 * but the function must not trust it.
 */
export function parsePreviewPath(path: string): PreviewTarget | undefined {
    let segments;
    try {
        segments = path
            .split('/')
            .filter((segment) => segment.length > 0)
            .map(decodeURIComponent);
    } catch {
        return undefined;
    }
    const locales =
        segments.length === 3 ? segments[0].split('+').filter(Boolean) : [];
    const rest = segments.length === 3 ? segments.slice(1) : segments;
    if (rest.length !== 2) return undefined;
    const [kind, id] = rest;
    if (kind !== 'project' && kind !== 'gallery') return undefined;
    if (id.length === 0) return undefined;
    return { kind, id, locales };
}

/** Mirrors TextCloseByTextOpen in src/parser/Tokenizer.ts. */
const TextCloseByTextOpen: Record<string, string> = {
    '"': '"',
    '“': '”',
    '„': '“',
    "'": "'",
    '‘': '’',
    '‹': '›',
    '«': '»',
    '「': '」',
    '『': '』',
    '`': '`',
};

/**
 * Resolve a project name that may be a multilingual Wordplay TextLiteral,
 * e.g. `"project"/en"proyecto"/es` — a simplified mirror of
 * src/db/projects/getLocalizedProjectName.ts, matching its contract: only a
 * string that parses cleanly end-to-end as language-tagged translations is
 * treated as multilingual; anything else renders raw.
 */
export function resolveMultilingualName(
    raw: string,
    languages: string[],
): string {
    if (raw.length === 0) return raw;
    const close = TextCloseByTextOpen[raw[0]];
    if (close === undefined) return raw;

    const translations: { text: string; language: string }[] = [];
    let position = 0;
    while (position < raw.length) {
        const open = raw[position];
        const closer = TextCloseByTextOpen[open];
        if (closer === undefined) return raw;
        const end = raw.indexOf(closer, position + 1);
        if (end < 0) return raw;
        const text = raw.substring(position + 1, end);
        position = end + 1;
        if (raw[position] !== '/') return raw;
        position++;
        const language = /^[a-zA-Z]+/.exec(raw.substring(position))?.[0];
        if (language === undefined || language.length === 0) return raw;
        position += language.length;
        translations.push({ text, language });
    }
    if (translations.length === 0) return raw;
    const preferred = translations.find((translation) =>
        languages.includes(translation.language),
    );
    return (preferred ?? translations[0]).text;
}

/** Grapheme count, matching UnicodeString semantics for the preview-glyph check. */
function graphemeCount(text: string): number {
    const segmenter =
        typeof Intl !== 'undefined' && 'Segmenter' in Intl
            ? new Intl.Segmenter()
            : undefined;
    if (segmenter === undefined) return Array.from(text).length;
    return Array.from(segmenter.segment(text)).length;
}

/**
 * The project name from a `.wp` example file: an optional single-grapheme
 * preview-glyph first line is peeled, then the next line is the (possibly
 * multilingual) name — mirroring parseSerializedProject in
 * src/examples/examples.ts.
 */
export function parseWpProjectName(wp: string): string | undefined {
    let lines = wp.split('\n');
    const first = (lines[0] ?? '').trim();
    if (first.length > 0 && graphemeCount(first) === 1) lines = lines.slice(1);
    const name = (lines[0] ?? '').trim();
    return name.length > 0 ? name : undefined;
}

/**
 * The best string from a locale-keyed record: exact locale match, then
 * language match, then en-US, then anything — skipping entries that are
 * empty once localization annotations are stripped.
 */
export function pickLocalizedText(
    record: Record<string, string> | undefined,
    locales: string[],
): string | undefined {
    if (record === undefined) return undefined;
    const candidates: string[] = [];
    for (const locale of locales) {
        if (record[locale] !== undefined) candidates.push(record[locale]);
        const language = locale.split('-')[0];
        for (const key of Object.keys(record))
            if (key.split('-')[0] === language) candidates.push(record[key]);
    }
    if (record['en-US'] !== undefined) candidates.push(record['en-US']);
    candidates.push(...Object.values(record));
    for (const candidate of candidates) {
        const cleaned = withoutAnnotations(candidate);
        if (cleaned.length > 0) return cleaned;
    }
    return undefined;
}

export type PreviewMeta = {
    title: string;
    description?: string;
    url: string;
};

/**
 * Inject preview metadata into the SPA shell: set/insert <title> and replace
 * the content of the og:title / og:description / og:url tags app.html already
 * carries. Plain string surgery — the shell's head is our own app.html, whose
 * meta tags never contain a literal `>`.
 */
export function injectPreviewHead(shell: string, meta: PreviewMeta): string {
    const title = escapeHtml(meta.title);
    const url = escapeHtml(meta.url);
    let html = shell;

    const titleTag = `<title>${title}</title>`;
    if (/<title>[^<]*<\/title>/.test(html))
        html = html.replace(/<title>[^<]*<\/title>/, titleTag);
    else html = html.replace('</head>', `${titleTag}\n    </head>`);

    html = html.replace(
        /<meta[^>]*property="og:title"[^>]*>/,
        `<meta name="title" property="og:title" content="${title}" />`,
    );
    html = html.replace(
        /<meta[^>]*property="og:url"[^>]*>/,
        `<meta property="og:url" content="${url}" />`,
    );
    if (meta.description !== undefined) {
        const description = escapeHtml(meta.description);
        html = html.replace(
            /<meta[^>]*property="og:description"[^>]*>/,
            `<meta name="description" property="og:description" content="${description}" />`,
        );
    }
    return html;
}

/** A Firestore REST API value; only the shapes the preview reads. */
type FirestoreRestValue = {
    stringValue?: string;
    booleanValue?: boolean;
    mapValue?: { fields?: Record<string, FirestoreRestValue> };
};

export type FirestoreRestDocument = {
    name?: string;
    fields?: Record<string, FirestoreRestValue>;
};

export function getStringField(
    doc: FirestoreRestDocument,
    field: string,
): string | undefined {
    return doc.fields?.[field]?.stringValue;
}

export function getBooleanField(
    doc: FirestoreRestDocument,
    field: string,
): boolean | undefined {
    return doc.fields?.[field]?.booleanValue;
}

export function getStringMapField(
    doc: FirestoreRestDocument,
    field: string,
): Record<string, string> | undefined {
    const fields = doc.fields?.[field]?.mapValue?.fields;
    if (fields === undefined) return undefined;
    const record: Record<string, string> = {};
    for (const key of Object.keys(fields)) {
        const value = fields[key].stringValue;
        if (value !== undefined) record[key] = value;
    }
    return record;
}

/** The document id from a REST document resource name, e.g. ".../documents/projects/abc" → "abc". */
export function documentIdFromName(name: string): string {
    const segments = name.split('/');
    return segments[segments.length - 1];
}

/**
 * Routes worth listing in the sitemap: the prerendered public pages. Login,
 * localize, and the logged-in surfaces are deliberately absent.
 */
export const StaticSitemapPaths = [
    '/',
    '/about',
    '/learn',
    '/guide',
    '/galleries',
    '/characters',
    '/donate',
    '/join',
    '/rights',
];

export function buildSitemapXml(urls: string[]): string {
    const entries = urls
        .map((url) => `    <url><loc>${escapeHtml(url)}</loc></url>`)
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
