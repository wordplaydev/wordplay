<script lang="ts">
    import { animationFactor } from '@models/stores';
    import { onMount, setContext } from 'svelte';
    import Loading from '@components/app/Loading.svelte';
    import { preferredLanguages, preferredLocales } from '@translation/locales';
    import { auth } from '@db/firebase';
    import { onAuthStateChanged, type User } from 'firebase/auth';
    import {
        DarkSymbol,
        ProjectsSymbol,
        LocalesSymbol,
        UserSymbol,
    } from '../components/project/Contexts';
    import { writable } from 'svelte/store';
    import Fonts from '../native/Fonts';
    import Projects from '../db/Projects';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { PUBLIC_CONTEXT } from '$env/static/public';
    import { page } from '$app/stores';

    /** Expose the translations as context, updating them as necessary */
    $: setContext(LocalesSymbol, $preferredLocales);

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

        // Keep the user store in sync.
        const unsub = onAuthStateChanged(auth, async (newUser) => {
            // Update the store
            user.set(newUser);
            // Update the Projects with the new user, syncing with the database.
            projects.updateUser(newUser ? newUser.uid : null);
        });

        // Update dark mode, now that we're mounted.
        dark.set(isDarkSet());

        /** Load whatever is stored in local storage */
        projects.loadLocal();

        // Unusubscribe to auth listener on unmount and clean the project listeners.
        return () => {
            unsub();
            projects.clean();
        };
    });

    /** Create a database of projects linked to the current user. */
    const projects = new Projects();

    setContext(ProjectsSymbol, projects.getStore());

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
        style="--animation-factor: {$animationFactor}"
        lang={$preferredLanguages[0]}
    >
        {#if loaded}
            <slot />
        {:else}
            <Loading />
        {/if}
    </div>
{/if}
