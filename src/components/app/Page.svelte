<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import Settings from '../settings/Settings.svelte';
    import { locales } from '../../db/Database';
    import Link from './Link.svelte';
    import { writable } from 'svelte/store';
    import { setContext } from 'svelte';

    // Set a fullscreen flag to indicate whether footer should hide or not.
    // It's the responsibility of children componets to set this based on their state.
    // It's primarily ProjectView that does this.
    let fullscreen = writable(false);
    setContext('fullscreen', fullscreen);

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

<svelte:window on:keydown={handleKey} />

<div class="page">
    <main>
        <slot />
    </main>
    <footer class:fullscreen={$fullscreen}>
        <Link tip={$locales.get((l) => l.ui.widget.home)} to="/">💬</Link>
        <Link to="/learn">{$locales.get((l) => l.ui.page.learn.header)}</Link>
        <Link to="/projects"
            >{$locales.get((l) => l.ui.page.projects.header)}</Link
        >
        <Link to="/galleries"
            >{$locales.get((l) => l.ui.page.galleries.header)}</Link
        >
        <Link to="/donate">{$locales.get((l) => l.ui.page.donate.header)}</Link>
        <Settings />
    </footer>
</div>

<style>
    .page {
        width: 100%;
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
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
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        max-width: 100%;
        overflow: auto;
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        background: var(--wordplay-background);
        z-index: 1;
        gap: var(--wordplay-spacing);
    }

    .fullscreen:not(:hover) {
        opacity: 0.25;
    }
</style>
