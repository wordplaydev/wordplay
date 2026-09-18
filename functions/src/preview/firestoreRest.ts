import { isRecord } from '../shared/guards.js';
import {
    isFirestoreRestDocument,
    type FirestoreRestDocument,
} from './shared.js';

/**
 * Firestore's REST query API, for the two functions that run before any client
 * exists: the sitemap and the social preview.
 *
 * Here rather than in preview/shared.ts on purpose — that module is compiled by
 * the root test suite under the app's tsconfig, so it must stay free of I/O and
 * of anything Node-only. This is the half that fetches.
 *
 * Unauthenticated, so Firestore's own rules decide what comes back: a query for
 * a gallery by vanity path returns nothing unless the gallery is public, which
 * is the same answer a visitor would get.
 */

const FETCH_TIMEOUT_MS = 10_000;

/** A `field == value` filter in the REST API's shape. */
export function equals(
    field: string,
    value: string | boolean,
): Record<string, unknown> {
    return {
        fieldFilter: {
            field: { fieldPath: field },
            op: 'EQUAL',
            value:
                typeof value === 'boolean'
                    ? { booleanValue: value }
                    : { stringValue: value },
        },
    };
}

/** A `field array-contains value` filter in the REST API's shape. */
export function arrayContains(
    field: string,
    value: string,
): Record<string, unknown> {
    return {
        fieldFilter: {
            field: { fieldPath: field },
            op: 'ARRAY_CONTAINS',
            value: { stringValue: value },
        },
    };
}

function base(): string {
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;
    return emulator ? `http://${emulator}` : 'https://firestore.googleapis.com';
}

/**
 * Run a structured query, or undefined when we could not ask — which callers
 * treat as "serve what we have" rather than as an empty result.
 */
export async function runQuery(
    collection: string,
    options: {
        filters: Record<string, unknown>[];
        select?: string[];
        limit?: number;
    },
): Promise<FirestoreRestDocument[] | undefined> {
    const project = process.env.GCLOUD_PROJECT ?? 'demo-wordplay';
    const { filters, select, limit } = options;
    const first = filters[0];
    if (first === undefined) return undefined;
    try {
        const response = await fetch(
            `${base()}/v1/projects/${project}/databases/(default)/documents:runQuery`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                body: JSON.stringify({
                    structuredQuery: {
                        from: [{ collectionId: collection }],
                        where:
                            filters.length === 1
                                ? first
                                : {
                                      compositeFilter: {
                                          op: 'AND',
                                          filters,
                                      },
                                  },
                        ...(select === undefined
                            ? {}
                            : {
                                  select: {
                                      fields: select.map((fieldPath) => ({
                                          fieldPath,
                                      })),
                                  },
                              }),
                        ...(limit === undefined ? {} : { limit }),
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
        const results: unknown = await response.json();
        if (!Array.isArray(results)) return undefined;
        return results
            .map((result: unknown) =>
                isRecord(result) ? result.document : undefined,
            )
            .filter(isFirestoreRestDocument);
    } catch (error) {
        console.error(`${collection} query failed`, error);
        return undefined;
    }
}
