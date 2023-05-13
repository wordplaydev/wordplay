<script lang="ts">
    import { onMount, setContext } from 'svelte';
    import Loading from '@components/app/Loading.svelte';
    import type { User } from 'firebase/auth';
    import {
        DarkSymbol,
        LocalesSymbol,
        UserSymbol,
    } from '../components/project/Contexts';
    import { writable } from 'svelte/store';
    import Fonts from '../native/Fonts';
    import { creator } from '../db/Creator';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import { page } from '$app/stores';

    /** Expose the translations as context, updating them as necessary */
    $: setContext(LocalesSymbol, $creator.getLocales());

    let loaded = false;

    /** Create a user store to share globally. */
    const user = writable<User | null>(null);
    setContext(UserSymbol, user);

    onMount(() => {
        if (PUBLIC_CONTEXT === 'prod') goto('/');

        // Force Noto Sans to load
        Fonts.loadFamily('Noto Sans');

        // Show only after fonts are loaded, to prevent font jiggle.
        document.fonts.ready.then(() => (loaded = true));

        // Login the user
        $creator.login((newUser) => user.set(newUser));

        // Update dark mode, now that we're mounted.
        dark.set(isDarkSet());

        /** Load whatever is stored in local storage */
        $creator.loadLocal();

        // Have the Creator cleanup database connections.
        return () => {
            $creator.clean();
        };
    });

    /** True if either local storage has dark set or the OS is set to dark. */
    function isDarkSet() {
        return (
            typeof window.localStorage !== 'undefined' &&
            window.localStorage.getItem('dark') === 'true'
        );
    }

    function prefersDark() {
        return (
            typeof window !== 'undefined' &&
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme:dark)').matches
        );
    }

    /** Share dark status globally */
    const dark = writable<boolean | undefined | null>(
        browser ? isDarkSet() : null
    );
    setContext(DarkSymbol, dark);

    /** When dark mode changes, persist it */
    $: {
        if (
            typeof window !== 'undefined' &&
            typeof window.localStorage !== 'undefined'
        ) {
            if ($dark === true || $dark === false)
                window.localStorage.setItem('dark', '' + $dark);
            else if ($dark === undefined)
                window.localStorage.removeItem('dark');
        }
    }

    /** When dark mode changes, update the body's dark class */
    $: {
        if (browser) {
            if ($dark === true || ($dark === undefined && prefersDark()))
                document.body.classList.add('dark');
            else document.body.classList.remove('dark');
        }
    }
</script>

{#if PUBLIC_CONTEXT !== 'prod' || $page.route.id === '/'}
    <div
        class:dark={$dark}
        style="--animation-factor: {$creator.getAnimationFactor()}"
        lang={$creator.getLanguages()[0]}
    >
        {#if loaded}
            <slot />
        {:else}
            <Loading />
        {/if}
    </div>
{/if}
