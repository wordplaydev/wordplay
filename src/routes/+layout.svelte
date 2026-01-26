<script module lang="ts">
    import type { NotificationData } from '@components/settings/Notifications.svelte';
    import { SvelteMap } from 'svelte/reactivity';

    /** User's notifications state
     * Maps a string (notification's item ID + type) to data
     * (Workaround to make sure that we don't send more than one notification of the same type)
     */
    export let notifications = $state<SvelteMap<string, NotificationData>>(
        new SvelteMap(),
    );
</script>

<script lang="ts">
    import { browser } from '$app/environment';
    import Loading from '@components/app/Loading.svelte';
    import Announcer from '@components/project/Announcer.svelte';
    import Hint, { ActiveHint } from '@components/widgets/Hint.svelte';
    import { firestore } from '@db/firebase';
    import { FaceSetting } from '@db/settings/FaceSetting';
    import type { User } from 'firebase/auth';
    import { onMount, type Snippet } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import Fonts from '../basis/Fonts';
    import {
        setAnnouncer,
        setTip,
        setUser,
        type AnnouncerContext,
    } from '../components/project/Contexts';
    import {
        animationFactor,
        dark,
        DB,
        howToNotifications,
        HowTos,
        locales,
        Settings,
    } from '../db/Database';
    import { getLanguageDirection } from '../locale/LanguageCode';
    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();

    let loaded = $state(false);
    let lag = $state(false);

    /** Create a user store to share globally. Undefined means we don't know if the user is logged in yet. Null means not logged in. */
    const user = writable<User | null | undefined>(undefined);
    setUser(user);

    // Create a store context for the announcer function.
    let announcerStore: Writable<AnnouncerContext> = writable();
    setAnnouncer(announcerStore);

    /** Keep the page's language and direction up to date. */
    $effect(() => {
        if (typeof document !== 'undefined') {
            const language = $locales.getLocale().language;
            document.documentElement.setAttribute('lang', language);
            document.documentElement.setAttribute(
                'dir',
                getLanguageDirection(language),
            );
        }
    });

    onMount(() => {
        // Force default font to load
        Fonts.loadFace('Noto Sans');

        // Show only after fonts are loaded, to prevent font jiggle.
        document.fonts.ready.then(() => (loaded = true));

        // Listen for logged in users.
        DB.login((newUser) => user.set(newUser));

        // Wait a second before showing loading
        setTimeout(() => (lag = true), 1000);

        // Have the Database cleanup database connections when this is unmounted.
        return () => {
            DB.clean();
        };
    });

    function prefersDark() {
        return (
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme:dark)').matches
        );
    }

    /** When dark mode changes, update the body's dark class */
    $effect(() => {
        if (browser) {
            if ($dark === true || ($dark === null && prefersDark()))
                document.body.classList.add('dark');
            else document.body.classList.remove('dark');
        }
    });

    function computeAppFace() {
        return Array.from(
            new Set([
                // Get the override UI font from settings, if selected
                ...[Settings.getFace()].filter((f) => f !== null),
                // Get all of the fonts preferred by the locale
                ...$locales.getLocales().map((locale) => locale.ui.font.app),
                // Fall back to the emoji fonts for emojis, color first.
                'Noto Color Emoji',
                'Noto Emoji',
            ]),
        )
            .map((font) => `"${font}"`)
            .join(', ');
    }

    let appFaces = $state(computeAppFace());

    let codeFonts = $derived(
        Array.from(
            new Set([
                ...$locales.getLocales().map((locale) => locale.ui.font.code),
                'Noto Sans Mono',
                'Noto Emoji',
                'Noto Color Emoji',
                'Noto Sans',
            ]),
        )
            .map((font) => `"${font}"`)
            .join(', '),
    );

    // When the face store changes, update the app faces and load the font, if not loaded.
    // Eventually need to migrate this to $state runes for deep reactivity, to avoid the mess above.
    onMount(() => {
        const unsub = FaceSetting.value.subscribe((value) => {
            appFaces = computeAppFace();
            if (value) Fonts.loadFace(value);
        });
        return () => unsub();
    });

    /** Create a global state for a tip to show at the top level */
    setTip(new ActiveHint());

    // if the user turns off how-to notifications, clear existing notifications
    // if notifications are on, listen for changing from the how-to database
    $effect(() => {
        if (!$howToNotifications) {
            notifications.clear();
            HowTos.ignore();
        } else if ($user && firestore) {
            HowTos.listen(firestore, $user.uid);
        }
    });
</script>

<div
    class="root"
    class:dark={$dark}
    style:--animation-factor={$animationFactor}
    style:--wordplay-app-font={appFaces}
    style:--wordplay-code-font={codeFonts}
    lang={$locales.getLocale().language}
>
    {#if !loaded && lag}
        <Loading />
    {:else}
        {@render children()}
    {/if}
</div>
<!-- Render a live region with announcements as soon as possible -->
<Announcer
    bind:announcer={() => $announcerStore, (fn) => announcerStore.set(fn)}
/>
<Hint></Hint>

<style>
    .root {
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        font-size: var(--wordplay-font-size);
        color: var(--wordplay-foreground);
    }
</style>
