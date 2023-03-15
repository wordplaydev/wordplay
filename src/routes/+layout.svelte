<script lang="ts">
    import { animationsOn } from '@models/stores';
    import { onMount, setContext } from 'svelte';
    import Loading from '@components/app/Loading.svelte';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import { auth } from '@db/firebase';
    import {
        onAuthStateChanged,
        signInAnonymously,
        type User,
    } from 'firebase/auth';
    import {
        DarkSymbol,
        ProjectsSymbol,
        TranslationsSymbol,
        UserSymbol,
    } from '../components/project/Contexts';
    import { writable } from 'svelte/store';
    import Fonts from '../native/Fonts';
    import Projects from '../db/Projects';
    import { FirebaseError } from 'firebase/app';
    import Style from '../components/app/Style.svelte';
    import { browser } from '$app/environment';

    /** Expose the translations as context, updating them as necessary */
    $: setContext(TranslationsSymbol, $preferredTranslations);

    let loaded = false;

    /** Create a user store to share globally. */
    const user = writable<User | null | undefined>(undefined);
    setContext(UserSymbol, user);

    /** Keep track of whether we've signed in anonymously so we only do it once. */
    let authenticated: boolean | null = false;

    onMount(() => {
        // Force Noto Sans to load
        Fonts.loadFamily('Noto Sans');

        // Show only after fonts are loaded, to prevent font jiggle.
        document.fonts.ready.then(() => (loaded = true));

        // Keep the user store in sync.
        const unsub = onAuthStateChanged(auth, async (newUser) => {
            // Sign in anonymously if no user.
            if (newUser === null && !authenticated) {
                try {
                    await signInAnonymously(auth);
                    authenticated = true;
                } catch (err: any) {
                    if (err instanceof FirebaseError) {
                        console.error(err.code);
                        console.error(err.message);
                        authenticated = null;
                        user.set(undefined);
                    }
                }
            } else {
                authenticated = true;
                // Update the store.
                user.set(newUser);
            }
        });

        // Update dark mode, now that we're mounted.
        dark.set(isDarkSet());

        /** Load whatever is stored in local storage */
        projects.loadLocal();

        // Unusubscribe to auth listener on unmount.
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

<Style />

<div
    class:animated={$animationsOn}
    class:dark={$dark}
    lang={$preferredLanguages[0]}
>
    {#if loaded}
        <slot />
    {:else}
        <Loading />
    {/if}
</div>
