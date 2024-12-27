<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import Settings from '../settings/Settings.svelte';
    import { locales } from '../../db/Database';
    import Link from './Link.svelte';
    import { writable } from 'svelte/store';
    import { type Snippet } from 'svelte';
    import Color from '../../output/Color';
    import Emoji from './Emoji.svelte';
    import {
        setFullscreen,
        type FullscreenContext,
    } from '@components/project/Contexts';

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
                <Link nowrap tip={$locales.get((l) => l.ui.widget.home)} to="/"
                    ><Emoji>💬</Emoji></Link
                >
                <Link nowrap to="/projects"
                    >{$locales.get((l) => l.ui.page.projects.header)}</Link
                >
                <Link nowrap to="/learn"
                    >{$locales.get((l) => l.ui.page.learn.header)}</Link
                >
                <Link nowrap to="/galleries"
                    >{$locales.get((l) => l.ui.page.galleries.header)}</Link
                >
                <Link nowrap to="/guide"
                    >{$locales.get((l) => l.ui.page.guide.header)}</Link
                >
                <Link nowrap to="/teach"
                    >{$locales.get((l) => l.ui.page.teach.header)}</Link
                >
                <Link nowrap external to="https://discord.gg/Jh2Qq9husy"
                    >{$locales.get((l) => l.term.help)}</Link
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
        white-space: nowrap;
    }

    nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }
</style>
