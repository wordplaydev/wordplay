import type { HandleClientError } from '@sveltejs/kit/hooks';

/**
 * Keep an unexpected error's own message, so the error page can show it.
 * Kit otherwise reduces it to "Internal Error", and an error that reaches the
 * page (a throw outside every component boundary) is then known only by a
 * teacher's photo of a page that says nothing about what failed.
 */
export const handleError: HandleClientError = (caught) => {
    if (caught.kind !== 'unknown') return;
    console.error(caught.error);
    if (caught.error instanceof Error)
        return { message: `${caught.error.name}: ${caught.error.message}` };
};
