import LocalePath from '@util/verify-locales/LocalePath';
import type LocaleText from '@locale/LocaleText';

/**
 * Reflects on the source code of an accessor function to extract its locale property path,
 * and converts it into a LocalePath. Optional trailing segments are appended to address
 * nested fields or array elements (e.g., a tuple index in `ModeText.labels`).
 * Returns undefined if the function source doesn't match the expected `l.a.b.c` pattern.
 *
 * Examples:
 *   `(l) => l.ui.localize.button.edit` → LocalePath with path ['ui','localize','button'], key 'edit'
 *   accessor `(l) => l.ui.dialog.settings.mode.dark` + `'labels', 0` → key 0 at path ['ui','dialog','settings','mode','dark','labels']
 */
export function accessorToLocalePath(
    accessor: (locale: LocaleText) => unknown,
    ...trailing: (string | number)[]
): LocalePath | undefined {
    const source = accessor.toString();
    // Match arrow functions like: (l) => l.a.b.c or l => l.a.b.c
    const match = source.match(/\(?\s*(\w+)\s*\)?\s*=>\s*\1\.([a-zA-Z0-9.]+)/);
    if (!match) return undefined;

    const segments: (string | number)[] = match[2].split('.');
    segments.push(...trailing);
    if (segments.length === 0) return undefined;

    const key = segments[segments.length - 1];
    const path = segments.slice(0, segments.length - 1);

    return new LocalePath(path, key, '');
}
