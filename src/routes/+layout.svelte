<script lang="ts">
    import { onMount, setContext } from 'svelte';
    import Loading from '@components/app/Loading.svelte';
    import type { User } from 'firebase/auth';
    import { LocalesSymbol, UserSymbol } from '../components/project/Contexts';
    import { writable } from 'svelte/store';
    import Fonts from '../basis/Fonts';
    import { locales, DB, animationFactor, dark } from '../db/Database';
    import { browser } from '$app/environment';
    import { getLanguageDirection } from '../locale/LanguageCode';

    /** Expose the translations as context, updating them as necessary */
    $: setContext(LocalesSymbol, $locales);

    let loaded = false;
    let lag = false;

    /** Create a user store to share globally. */
    const user = writable<User | null>(null);
    setContext(UserSymbol, user);

    // Keep the page's language and direction up to date.
    $: if (typeof document !== 'undefined') {
        const language = $locales.getLocale().language;
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute(
            'dir',
            getLanguageDirection(language)
        );
    }

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
    $: if (browser) {
        if ($dark === true || ($dark === null && prefersDark()))
            document.body.classList.add('dark');
        else document.body.classList.remove('dark');
    }
</script>

<div
    class:dark={$dark}
    style:--animation-factor={$animationFactor}
    style:--wordplay-app-font={Array.from(
        new Set([
            ...$locales.getLocales().map((locale) => locale.ui.font.app),
            'Noto Emoji',
            'Noto Color Emoji',
        ])
    )
        .map((font) => `"${font}"`)
        .join(', ')}
    style:--wordplay-code-font={Array.from(
        new Set([
            ...$locales.getLocales().map((locale) => locale.ui.font.code),
            'Noto Sans Mono',
            'Noto Emoji',
            'Noto Color Emoji',
            'Noto Sans',
        ])
    )
        .map((font) => `"${font}"`)
        .join(', ')}
    lang={$locales.getLocale().language}
>
    <slot />
    {#if !loaded && lag}
        <Loading />
    {/if}
</div>
