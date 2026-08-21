import type express from 'express';
import type { Request } from 'firebase-functions/v2/https';
import { canonicalOrigin } from './getPagePreview.js';
import {
    buildSitemapXml,
    documentIdFromName,
    ExampleGalleries,
    ExamplePrefix,
    getBooleanField,
    StaticSitemapPaths,
    type FirestoreRestDocument,
} from './preview/shared.js';

/**
 * Serves /sitemap.xml (via a Firebase Hosting rewrite): the prerendered
 * public routes, the built-in example galleries and projects, and the
 * public projects and galleries in Firestore (#1133). Reads use the
 * Firestore REST API with no credentials, filtered on `public == true` —
 * the one filter the security rules provably allow for unauthenticated
 * list queries (the same query the galleries page runs client-side) —
 * with `listed`/`archived` narrowed in code afterward.
 */

const FETCH_TIMEOUT_MS = 10_000;
const QUERY_LIMIT = 5000;

async function queryPublicDocs(
    collection: 'projects' | 'galleries',
    fields: string[],
): Promise<FirestoreRestDocument[] | undefined> {
    const project = process.env.GCLOUD_PROJECT ?? 'demo-wordplay';
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;
    const base = emulator
        ? `http://${emulator}`
        : 'https://firestore.googleapis.com';
    try {
        const response = await fetch(
            `${base}/v1/projects/${project}/databases/(default)/documents:runQuery`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: collection }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: 'public' },
                                op: 'EQUAL',
                                value: { booleanValue: true },
                            },
                        },
                        select: {
                            fields: fields.map((fieldPath) => ({ fieldPath })),
                        },
                        limit: QUERY_LIMIT,
                    },
                }),
            },
        );
        if (!response.ok) {
            console.error(
                `${collection} query failed: ${response.status} ${await response.text()}`,
            );
            return undefined;
        }
        const results = (await response.json()) as {
            document?: FirestoreRestDocument;
        }[];
        return results
            .map((result) => result.document)
            .filter(
                (doc): doc is FirestoreRestDocument =>
                    doc !== undefined && doc.name !== undefined,
            );
    } catch (error) {
        console.error(`${collection} query failed`, error);
        return undefined;
    }
}

export default async function getSitemap(
    _: Request,
    response: express.Response,
): Promise<void> {
    const origin = canonicalOrigin();
    const urls = StaticSitemapPaths.map((path) =>
        path === '/' ? origin : `${origin}${path}`,
    );

    for (const id of Object.keys(ExampleGalleries)) {
        urls.push(`${origin}/gallery/${id}`);
        for (const name of ExampleGalleries[id].projects)
            urls.push(`${origin}/project/${ExamplePrefix}${name}`);
    }

    // On a Firestore failure the static portion still ships; the CDN's stale
    // copy usually covers the gap, so a partial sitemap beats an error.
    const projects = await queryPublicDocs('projects', ['listed', 'archived']);
    if (projects !== undefined)
        for (const doc of projects) {
            if (getBooleanField(doc, 'listed') !== true) continue;
            if (getBooleanField(doc, 'archived') === true) continue;
            urls.push(
                `${origin}/project/${encodeURIComponent(documentIdFromName(doc.name ?? ''))}`,
            );
        }

    const galleries = await queryPublicDocs('galleries', ['public']);
    if (galleries !== undefined)
        for (const doc of galleries)
            urls.push(
                `${origin}/gallery/${encodeURIComponent(documentIdFromName(doc.name ?? ''))}`,
            );

    response.set('Content-Type', 'application/xml; charset=utf-8');
    response.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    response.status(200).send(buildSitemapXml(urls));
}
