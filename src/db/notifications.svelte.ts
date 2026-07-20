import type { NotificationData } from '@components/settings/Notifications.svelte';
import { SvelteMap } from 'svelte/reactivity';

/** User's notifications state.
 * Maps a string (notification's item ID + type) to data
 * (Workaround to make sure that we don't send more than one notification of the same type)
 *
 * Lives here — not in the root `+layout.svelte` — so the databases that write
 * notifications (Chat, HowTo) don't import from a route component. That import
 * would pull each SvelteKit route node's `component` export into the db module
 * cycle, which crashes WebKit hydration once anything makes the graph async. */
export const notifications = $state<SvelteMap<string, NotificationData>>(
    new SvelteMap(),
);
