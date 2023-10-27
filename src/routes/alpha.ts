import { browser } from '$app/environment';
import { PUBLIC_CONTEXT } from '$env/static/public';

const ALPHA =
    browser &&
    PUBLIC_CONTEXT === 'prod' &&
    (typeof localStorage === 'undefined' ||
        localStorage.getItem('bypass') === null);
export default ALPHA;
