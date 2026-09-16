import {
    LocaleAssetHashes,
    LocaleAssetsVersion,
} from '@db/locales/localeAssets.generated';

/**
 * Append a cache-bust query param keyed on the asset's own content.
 *
 * Static locale files under /locales/ are not content-hashed in their names, so
 * browsers/CDN can serve a copy cached from an older deploy against newer
 * (hashed, immutable) JS — causing version skew where the new code reads keys
 * the stale JSON lacks. Tying the URL to a hash of the file's contents keeps
 * that invariant while costing nothing when nothing changed: the build version
 * used to stand in for content here, and since only about a third of deploys
 * touch a locale, every other one re-downloaded a creator's whole locale
 * (130-145KB brotli) to get back byte-identical text.
 *
 * `/locales/**` is served `immutable` (see firebase.json), which is only safe
 * because every fetch of one goes through here — `localeFetchConvention.test.ts`
 * is what keeps that true.
 */
export default function versioned(path: string): string {
    const hash = LocaleAssetHashes[path];
    return `${path}?v=${encodeURIComponent(hash ?? LocaleAssetsVersion)}`;
}
