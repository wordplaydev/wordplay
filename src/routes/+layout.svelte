<script lang="ts">
    import { onMount, setContext } from 'svelte';
    import Loading from '@components/app/Loading.svelte';
    import type { User } from 'firebase/auth';
    import { LocalesSymbol, UserSymbol } from '../components/project/Contexts';
    import { writable } from 'svelte/store';
    import Fonts from '../basis/Fonts';
    import {
        locales,
        DB,
        animationFactor,
        languages,
        dark,
    } from '../db/Database';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import { page } from '$app/stores';
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
        const language = $locales[0].language;
        document.documentElement.setAttribute('lang', language);
        document.documentElement.setAttribute(
            'dir',
            getLanguageDirection(language)
        );
    }

    onMount(() => {
        if (PUBLIC_CONTEXT === 'prod') goto('/');

        // Force default font to load
        Fonts.loadFace('Noto Sans');

        // Show only after fonts are loaded, to prevent font jiggle.
        document.fonts.ready.then(() => (loaded = true));

        // Login the user
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

{#if PUBLIC_CONTEXT !== 'prod' || $page.route.id === '/'}
    <div
        class:dark={$dark}
        style:--animation-factor={$animationFactor}
        style:--wordplay-app-font={Array.from(
            new Set([
                ...$locales.map((locale) => locale.ui.font.app),
                'Noto Emoji',
            ])
        )
            .map((font) => `"${font}"`)
            .join(', ')}
        style:--wordplay-code-font={Array.from(
            new Set([
                ...$locales.map((locale) => locale.ui.font.code),
                'Noto Mono',
                'Noto Emoji',
            ])
        )
            .map((font) => `"${font}"`)
            .join(', ')}
        lang={$languages[0]}
    >
        <slot />
        {#if !loaded && lag}
            <Loading />
        {/if}
    </div>
{/if}
