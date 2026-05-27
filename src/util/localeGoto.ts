import { goto } from '$app/navigation';
import { page } from '$app/state';

type GotoOptions = Parameters<typeof goto>[1];

/** Navigate to path, automatically prefixing with the current locale segment. */
export function localeGoto(path: string, options?: GotoOptions): ReturnType<typeof goto> {
    const locale = (page.params as Record<string, string>).locale;
    const prefixed = locale ? `/${locale}${path === '/' ? '' : path}` : path;
    return goto(prefixed, options);
}
