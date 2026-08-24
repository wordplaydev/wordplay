import { isEmail } from '@parser/Tokenizer';

/** The schemes a link in documentation may point at. Anything else — a
 *  `javascript:` URL above all — is not a link a creator has any reason to
 *  write, and documentation is authored by creators and shown to everyone. */
const AllowedSchemes = ['http:', 'https:', 'mailto:'];

/**
 * The address a URL token in markup actually points at.
 *
 * Three shapes reach this: an internal path, written `://path` and rendered
 * relative to the site; a bare email address, which needs the `mailto:` scheme
 * added since nobody writes one out; and an ordinary URL, which is left alone.
 *
 * Returns undefined for anything whose scheme isn't allowed, so callers render
 * the description as plain text rather than a link.
 */
export default function linkHref(text: string): string | undefined {
    // The site's own convention for an internal link: no scheme at all.
    if (text.startsWith('://')) return text.replace('://', '/');
    if (isEmail(text)) return `mailto:${text}`;
    // A relative path is internal too, and has no scheme to check.
    if (text.startsWith('/')) return text;
    try {
        return AllowedSchemes.includes(new URL(text).protocol)
            ? text
            : undefined;
    } catch {
        // Not a URL at all — a stray token in a malformed link.
        return undefined;
    }
}
