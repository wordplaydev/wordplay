import { dev } from '$app/environment';
// Disable SSR when running the dev server to work around Vite hang.
export const ssr = !dev;
