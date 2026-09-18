import { equals, runQuery } from './preview/firestoreRest.js';
import type express from 'express';
import type { Request } from 'firebase-functions/v2/https';
import { canonicalOrigin } from './origin.js';
import {
    buildSitemapXml,
    documentIdFromName,
    getStringField,
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

const QUERY_LIMIT = 5000;

/** Public documents of a collection, with only the fields we need. Undefined on
 *  failure, which keeps the static half of the sitemap shippable. */
async function queryPublicDocs(
    collection: 'projects' | 'galleries',
    fields: string[],
): Promise<FirestoreRestDocument[] | undefined> {
    return runQuery(collection, {
        filters: [equals('public', true)],
        select: fields,
        limit: QUERY_LIMIT,
    });
}

export default async function getSitemap(
    _: Request,
    response: express.Response,
): Promise<void> {
    const origin = canonicalOrigin();
    const urls = StaticSitemapPaths.map((path) =>
        path === '/' ? origin : `${origin}${path}`,
    );

    for (const [id, gallery] of Object.entries(ExampleGalleries)) {
        urls.push(`${origin}/gallery/${id}`);
        for (const name of gallery.projects)
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

    const galleries = await queryPublicDocs('galleries', ['public', 'path']);
    if (galleries !== undefined)
        for (const doc of galleries) {
            // A gallery with a vanity path is listed at that URL *instead of*
            // its ID one, never both (#180). Two URLs for one page is a
            // canonicalization problem, and a sitemap is the strongest
            // canonical signal we emit.
            const path = getStringField(doc, 'path');
            urls.push(
                `${origin}/gallery/${encodeURIComponent(
                    path ?? documentIdFromName(doc.name ?? ''),
                )}`,
            );
        }

    response.set('Content-Type', 'application/xml; charset=utf-8');
    response.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    response.status(200).send(buildSitemapXml(urls));
}
