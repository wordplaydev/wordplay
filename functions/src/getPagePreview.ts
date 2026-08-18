import type express from 'express';
import type { Request } from 'firebase-functions/v2/https';
import {
    ExampleGalleries,
    ExamplePrefix,
    getStringField,
    getStringMapField,
    injectPreviewHead,
    parsePreviewPath,
    parseWpProjectName,
    pickLocalizedText,
    resolveMultilingualName,
    withoutAnnotations,
    type FirestoreRestDocument,
    type PreviewMeta,
    type PreviewTarget,
} from './preview/shared.js';

/**
 * Serves project and gallery URLs (via Firebase Hosting rewrites) as the SPA
 * shell with server-injected <title>/og:* metadata, so shared links unfurl
 * and crawlers see real titles (#1133). Public docs are read through the
 * Firestore REST API with no credentials, so security rules — not this code —
 * decide what is visible; private or missing docs get the shell untouched,
 * which is exactly what static hosting served before this function existed.
 */

const FETCH_TIMEOUT_MS = 5000;
const SHELL_TTL_MS = 60_000;
const LOCALE_TTL_MS = 60 * 60_000;

/**
 * The canonical origin, derived from the project rather than request headers:
 * header-derived origins would be attacker-controlled text in the emitted
 * HTML, and a wrong guess could make the shell fetch below recurse into this
 * very function.
 */
export function canonicalOrigin(): string {
    if (process.env.FUNCTIONS_EMULATOR === 'true')
        return process.env.WORDPLAY_HOSTING_ORIGIN ?? 'http://127.0.0.1:5002';
    return process.env.GCLOUD_PROJECT === 'wordplay-prod'
        ? 'https://wordplay.dev'
        : 'https://test.wordplay.dev';
}

async function fetchText(url: string): Promise<string | undefined> {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) return undefined;
        return await response.text();
    } catch (error) {
        console.error(`GET ${url} failed`, error);
        return undefined;
    }
}

/** In-memory caches; per-instance, refreshed on TTL and kept stale on error. */
let shellCache: { html: string; fetched: number } | undefined;
const localeCache = new Map<string, { json: unknown; fetched: number }>();

async function getShell(origin: string): Promise<string | undefined> {
    if (shellCache && Date.now() - shellCache.fetched < SHELL_TTL_MS)
        return shellCache.html;
    const html = await fetchText(`${origin}/200.html`);
    // Guard against a proxy error page or truncated read; stale is better.
    if (html !== undefined && html.includes('</head>'))
        shellCache = { html, fetched: Date.now() };
    return shellCache?.html;
}

/** The `gallery` block of a locale's JSON, fetched from hosting's static assets. */
async function getLocaleGalleryText(
    origin: string,
    locale: string,
): Promise<
    Record<string, { name?: string; description?: string }> | undefined
> {
    // The locale segment was decoded from a URL; only fetch plausible locale codes.
    if (!/^[A-Za-z0-9-]{2,20}$/.test(locale)) return undefined;
    const cached = localeCache.get(locale);
    if (cached && Date.now() - cached.fetched < LOCALE_TTL_MS)
        return asGalleryText(cached.json);
    const text = await fetchText(`${origin}/locales/${locale}/${locale}.json`);
    if (text === undefined) return asGalleryText(cached?.json);
    try {
        const json: unknown = JSON.parse(text);
        localeCache.set(locale, { json, fetched: Date.now() });
        return asGalleryText(json);
    } catch {
        return asGalleryText(cached?.json);
    }
}

function asGalleryText(
    json: unknown,
): Record<string, { name?: string; description?: string }> | undefined {
    if (json === undefined || json === null || typeof json !== 'object')
        return undefined;
    const gallery = (json as Record<string, unknown>)['gallery'];
    if (gallery === null || typeof gallery !== 'object') return undefined;
    return gallery as Record<string, { name?: string; description?: string }>;
}

async function fetchFirestoreDoc(
    collection: 'projects' | 'galleries',
    id: string,
): Promise<FirestoreRestDocument | undefined> {
    const project = process.env.GCLOUD_PROJECT ?? 'demo-wordplay';
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;
    const base = emulator
        ? `http://${emulator}`
        : 'https://firestore.googleapis.com';
    const text = await fetchText(
        `${base}/v1/projects/${project}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`,
    );
    if (text === undefined) return undefined;
    try {
        return JSON.parse(text) as FirestoreRestDocument;
    } catch {
        return undefined;
    }
}

/** The preview metadata for a target, or undefined to serve the plain shell. */
async function resolveMeta(
    target: PreviewTarget,
    origin: string,
): Promise<PreviewMeta | undefined> {
    const languages = target.locales.map((locale) => locale.split('-')[0]);
    const localePrefix =
        target.locales.length > 0 ? `/${target.locales.join('+')}` : '';
    const url = `${origin}${localePrefix}/${target.kind}/${encodeURIComponent(target.id)}`;

    if (target.kind === 'project') {
        if (target.id.startsWith(ExamplePrefix)) {
            const wp = await fetchText(
                `${origin}/examples/${encodeURIComponent(target.id.substring(ExamplePrefix.length))}.wp`,
            );
            // A hosting SPA fallback can serve HTML with a 200; mirror getExample's guard.
            if (wp === undefined || wp.trimStart().startsWith('<'))
                return undefined;
            const raw = parseWpProjectName(wp);
            if (raw === undefined) return undefined;
            return { title: resolveMultilingualName(raw, languages), url };
        }
        const doc = await fetchFirestoreDoc('projects', target.id);
        if (doc === undefined) return undefined;
        const raw = getStringField(doc, 'name');
        if (raw === undefined || raw.trim().length === 0) return undefined;
        return { title: resolveMultilingualName(raw.trim(), languages), url };
    }

    const example = ExampleGalleries[target.id];
    if (example !== undefined) {
        let name = example.name;
        let description = example.description;
        const primary = target.locales[0];
        if (primary !== undefined && primary !== 'en-US') {
            const galleryText = await getLocaleGalleryText(origin, primary);
            const localized = galleryText?.[example.localeKey];
            const localizedName = withoutAnnotations(localized?.name ?? '');
            const localizedDescription = withoutAnnotations(
                localized?.description ?? '',
            );
            if (localizedName.length > 0) name = localizedName;
            if (localizedDescription.length > 0)
                description = localizedDescription;
        }
        return { title: name, description, url };
    }

    const doc = await fetchFirestoreDoc('galleries', target.id);
    if (doc === undefined) return undefined;
    const title = pickLocalizedText(
        getStringMapField(doc, 'name'),
        target.locales,
    );
    if (title === undefined) return undefined;
    return {
        title,
        description: pickLocalizedText(
            getStringMapField(doc, 'description'),
            target.locales,
        ),
        url,
    };
}

export default async function getPagePreview(
    request: Request,
    response: express.Response,
): Promise<void> {
    const origin = canonicalOrigin();
    const shell = await getShell(origin);
    if (shell === undefined) {
        // Nothing to serve yet (cold start and hosting unreachable); let the
        // CDN retry rather than emitting a broken page.
        response.status(503).set('Retry-After', '30').send('');
        return;
    }

    const target = parsePreviewPath(request.path);
    const meta =
        target === undefined ? undefined : await resolveMeta(target, origin);

    response.set('Content-Type', 'text/html; charset=utf-8');
    // Successful previews cache longer at the CDN; misses (private, missing,
    // or Firestore trouble) cache briefly so a newly-published doc appears
    // promptly. Tradeoff: a project made private can keep its cached *title*
    // (nothing more) at the CDN for up to five minutes.
    response.set(
        'Cache-Control',
        meta !== undefined
            ? 'public, max-age=0, s-maxage=300'
            : 'public, max-age=0, s-maxage=60',
    );
    response
        .status(200)
        .send(meta === undefined ? shell : injectPreviewHead(shell, meta));
}
