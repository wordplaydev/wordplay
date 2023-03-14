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
        dark.set(isDarkTheme());

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
    function isDarkTheme() {
        return (
            typeof window.localStorage !== 'undefined' &&
            (window.localStorage.getItem('dark') === 'true' ||
                (window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme:dark)').matches))
        );
    }

    /** Share dark status globally */
    const dark = writable<boolean | undefined | null>(null);
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
        if (typeof document !== 'undefined') {
            if ($dark === true) document.body.classList.add('dark');
            else document.body.classList.remove('dark');
        }
    }
</script>

<svelte:head>
    <!-- Preload the default fonts -->
    <link
        rel="preload"
        href="/fonts/NotoSans/NotoSans-400.ttf"
        as="font"
        type="font/ttf"
        crossorigin="anonymous"
    />
    <link
        rel="preload"
        href="/fonts/NotoSans/NotoSans-400-italic.ttf"
        as="font"
        type="font/ttf"
        crossorigin="anonymous"
    />
    <link
        rel="preload"
        href="/fonts/NotoSans/NotoSans-700.ttf"
        as="font"
        type="font/ttf"
        crossorigin="anonymous"
    />
    <link
        rel="preload"
        href="/fonts/NotoSans/NotoSans-700-italic.ttf"
        as="font"
        type="font/ttf"
        crossorigin="anonymous"
    />
    <link
        rel="preload"
        href="/fonts/NotoEmoji/NotoEmoji-all.ttf"
        as="font"
        type="font/ttf"
        crossorigin="anonymous"
    />
    <link
        rel="preload"
        href="/fonts/NotoMono/NotoMono-all.ttf"
        as="font"
        type="font/ttf"
        crossorigin="anonymous"
    />
</svelte:head>

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

<style global>
    :root {
        --color-blue: #648fff;
        --color-purple: #785ef0;
        --color-pink: #dc267f;
        --color-orange: #fe6100;
        --color-yellow: #ffb000;
        --color-white: #ffffff;
        --color-black: #000000;
        --color-light-grey: #efefef;
        --color-dark-grey: #999999;

        /* Colors */
        --wordplay-foreground: var(--color-black);
        --wordplay-background: var(--color-white);
        --wordplay-chrome: var(--color-light-grey);
        --wordplay-border-color: var(--color-light-grey);
        --wordplay-evaluation-color: var(--color-pink);
        --wordplay-highlight: var(--color-yellow);
        --wordplay-error: var(--color-orange);
        --wordplay-warning: var(--color-yellow);
        --wordplay-disabled-color: var(--color-dark-grey);
        --wordplay-doc-color: var(--color-purple);
        --wordplay-relation-color: var(--color-orange);
        --wordplay-operator-color: var(--color-orange);
        --wordplay-type-color: var(--color-orange);

        /* Fonts */
        --wordplay-app-font: 'Noto Sans', 'Noto Emoji';
        --wordplay-code-font: 'Noto Mono', 'Noto Emoji';

        /* Spacing */
        --wordplay-editor-indent: 3em;
        --wordplay-editor-radius: 3px;
        --wordplay-spacing: 0.5em;
        --wordplay-font-weight: 500;
        --wordplay-font-size: 12pt;
        --wordplay-border-width: 1px;
        --wordplay-focus-width: 4px;
        --wordplay-border-radius: 5px;
        --wordplay-code-line-height: 1.6;
        --wordplay-palette-min-width: 5em;
        --wordplay-palette-max-width: 15em;

        --bounce-height: 0.5em;
        --wobble-rotation: 2deg;
    }

    :root .dark {
        --color-blue: #3a72fe;
        --color-purple: #5b3ce6;
        --color-pink: #fe2e93;
        --color-orange: #ba4904;
        --color-yellow: #cb8b00;
        --color-white: #ffffff;
        --color-black: #000000;
        --color-light-grey: #cccccc;
        --color-dark-grey: #888888;

        --wordplay-foreground: var(--color-white);
        --wordplay-background: var(--color-black);
        --wordplay-chrome: var(--color-dark-grey);
        --wordplay-border-color: var(--color-light-grey);
        --wordplay-evaluation-color: var(--color-pink);
        --wordplay-highlight: var(--color-yellow);
        --wordplay-error: var(--color-orange);
        --wordplay-warning: var(--color-yellow);
        --wordplay-disabled-color: var(--color-light-grey);
        --wordplay-doc-color: var(--color-purple);
        --wordplay-relation-color: var(--color-orange);
        --wordplay-operator-color: var(--color-orange);
        --wordplay-type-color: var(--color-orange);
    }

    @keyframes wobble {
        0% {
            transform: rotate(var(--wobble-rotation));
        }
        50% {
            transform: rotate(calc(-1 * var(--wobble-rotation)));
        }
        100% {
            transform: rotate(var(--wobble-rotation));
        }
    }

    @keyframes throb {
        0% {
            opacity: 0.8;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.8;
        }
    }

    @keyframes shift {
        0% {
            transform: translateX(2px);
        }
        50% {
            transform: translateX(-2px);
        }
        100% {
            transform: translateX(2px);
        }
    }

    @keyframes bounce {
        0% {
            transform: scale(1, 1) translateY(0);
        }
        10% {
            transform: scale(1.1, 0.9) translateY(0);
        }
        30% {
            transform: scale(0.9, 1.1)
                translateY(calc(-1 * var(--bounce-height)));
        }
        50% {
            transform: scale(1.05, 0.95) translateY(0);
        }
        57% {
            transform: scale(1, 1) translateY(-7px);
        }
        64% {
            transform: scale(1, 1) translateY(0);
        }
        100% {
            transform: scale(1, 1) translateY(0);
        }
    }

    @keyframes pulse {
        0% {
            stroke-width: calc(var(--wordplay-border-width) * 2);
        }

        70% {
            stroke-width: var(--wordplay-border-width);
        }

        100% {
            stroke-width: calc(var(--wordplay-border-width) * 2);
        }
    }

    @keyframes shake {
        10%,
        90% {
            transform: translate3d(-1px, 0, 0);
        }

        20%,
        80% {
            transform: translate3d(2px, 0, 0);
        }

        30%,
        50%,
        70% {
            transform: translate3d(-4px, 0, 0);
        }

        40%,
        60% {
            transform: translate3d(4px, 0, 0);
        }
    }

    @keyframes squish {
        10%,
        90% {
            transform: translate3d(0, -1px, 0);
        }
        20%,
        80% {
            transform: translate3d(0px, 2px, 0);
        }
        30%,
        50%,
        70% {
            transform: translate3d(0, -4px, 0) scale(1, 1.25);
        }
        40%,
        60% {
            transform: translate3d(0, 4px, 0) scale(1, 0.5);
        }
    }

    body {
        background-color: var(--wordplay-background);
        padding: 0;
        margin: 0;
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        color: var(--wordplay-foreground);
    }

    html {
        box-sizing: border-box;
    }

    * {
        box-sizing: inherit;
    }

    h1,
    h2,
    h3 {
        margin-bottom: var(--wordplay-spacing);
        margin-top: 0;
    }

    h1:not(:first-child),
    h2:not(:first-child),
    h3:not(:first-child) {
        margin-top: calc(2 * var(--wordplay-spacing));
    }

    h1 {
        font-size: large;
        font-weight: bold;
    }

    h2 {
        font-size: medium;
        font-weight: bold;
    }

    h3 {
        font-size: medium;
        font-style: italic;
        font-weight: normal;
    }

    p {
        margin: 0;
        font-family: var(--wordplay-app-font);
    }

    p:not(:last-of-type) {
        margin-bottom: calc(2 * var(--wordplay-spacing));
    }

    a {
        color: var(--wordplay-highlight);
        text-decoration: none;
        text-decoration-thickness: var(--wordplay-focus-width);
    }

    *:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
    }

    .firebase-emulator-warning {
        top: 0 !important;
        right: 1% !important;
        bottom: auto !important;
        left: 99% !important;
        font-family: var(--wordplay-app-font) !important;
        font-size: 4pt;
        color: var(--wordplay-error) !important;
        background: var(--wordplay-error) !important;
    }
</style>
