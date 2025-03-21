<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import {
        setFullscreen,
        type FullscreenContext,
    } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { type Snippet } from 'svelte';
    import { writable } from 'svelte/store';
    import Color from '../../output/Color';
    import Settings from '../settings/Settings.svelte';
    import Emoji from './Emoji.svelte';
    import Link from './Link.svelte';

    interface Props {
        children: Snippet;
        footer?: boolean;
    }

    let { children, footer = true }: Props = $props();

    // Set a fullscreen flag to indicate whether footer should hide or not.
    // It's the responsibility of children componets to set this based on their state.
    // It's primarily ProjectView that does this.
    let fullscreen: FullscreenContext = writable({
        on: false,
        background: null,
    });
    setFullscreen(fullscreen);

    $effect(() => {
        if (typeof document !== 'undefined' && $fullscreen) {
            document.body.style.background = $fullscreen.on
                ? $fullscreen.background instanceof Color
                    ? $fullscreen.background.toCSS()
                    : ($fullscreen.background ?? '')
                : '';
            document.body.style.color = $fullscreen.on
                ? $fullscreen.background instanceof Color
                    ? $fullscreen.background.contrasting().toCSS()
                    : ''
                : '';
        }
    });

    function handleKey(event: KeyboardEvent) {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key === 'Escape' &&
            $page.route.id !== null
        ) {
            goto('/');
        }
    }
</script>

<svelte:window onkeydown={handleKey} />

<div class="page">
    <main>
        {@render children()}
    </main>
    <footer class:fullscreen={$fullscreen.on}>
        <nav>
            {#if footer}
                <Link nowrap tip={(l) => l.ui.widget.home} to="/"
                    ><Emoji>💬</Emoji></Link
                >
                <Link nowrap to="/projects"
                    ><LocalizedText
                        path={(l) => l.ui.page.projects.header}
                    /></Link
                >
                <Link nowrap to="/galleries"
                    ><LocalizedText
                        path={(l) => l.ui.page.galleries.header}
                    /></Link
                >
                <Link nowrap to="/characters"
                    ><LocalizedText
                        path={(l) => l.ui.page.characters.header}
                    /></Link
                >
                <Link nowrap to="/learn"
                    ><LocalizedText
                        path={(l) => l.ui.page.learn.header}
                    /></Link
                >
                <Link nowrap to="/guide"
                    ><LocalizedText
                        path={(l) => l.ui.page.guide.header}
                    /></Link
                >
                <Link nowrap to="/teach"
                    ><LocalizedText
                        path={(l) => l.ui.page.teach.header}
                    /></Link
                >
                <Link nowrap external to="https://discord.gg/Jh2Qq9husy"
                    ><LocalizedText path={(l) => l.term.help} /></Link
                >
            {/if}
            <Settings />
        </nav>
    </footer>
</div>

<style>
    .page {
        width: 100vw;
        height: 100vh;
        display: flex;
        flex-direction: column;
    }

    main {
        display: flex;
        flex-direction: column;
        align-items: start;
        overflow: auto;
        flex: 1;
        min-height: 0;
    }

    main:focus {
        outline: none !important;
    }

    footer {
        width: 100%;
        max-width: 100%;
        overflow: auto;
        border-radius: var(--wordplay-border-radius);
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        z-index: 1;
        color: var(--wordplay-foreground);
        background: var(--wordplay-background);
    }

    nav {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
    }
</style>
