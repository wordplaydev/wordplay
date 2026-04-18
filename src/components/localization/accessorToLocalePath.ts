import LocalePath from '../../util/verify-locales/LocalePath';
import type { LocaleTextAccessor, LocaleTextsAccessor } from '@locale/Locales';

/**
 * Reflects on the source code of a LocaleTextAccessor or LocaleTextsAccessor function to extract
 * the locale property path, and converts it into a LocalePath.
 * Returns undefined if the function source doesn't match the expected pattern.
 *
 * Example: `(l) => l.ui.localize.button.edit` → LocalePath with path ['ui','localize','button'], key 'edit'
 */
export function accessorToLocalePath(
    accessor: LocaleTextAccessor | LocaleTextsAccessor,
): LocalePath | undefined {
    const source = accessor.toString();
    // Match arrow functions like: (l) => l.a.b.c or l => l.a.b.c
    const match = source.match(/\(?\s*(\w+)\s*\)?\s*=>\s*\1\.([a-zA-Z0-9.]+)/);
    if (!match) return undefined;

    const segments = match[2].split('.');
    if (segments.length === 0) return undefined;

    const key = segments[segments.length - 1];
    const path = segments.slice(0, segments.length - 1);

    return new LocalePath(path, key, '');
}
