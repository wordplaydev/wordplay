<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import Settings from '../settings/Settings.svelte';
    import { locales } from '../../db/Database';
    import Link from './Link.svelte';
    import { writable } from 'svelte/store';
    import { setContext } from 'svelte';
    import Color from '../../output/Color';
    import Emoji from './Emoji.svelte';

    // Set a fullscreen flag to indicate whether footer should hide or not.
    // It's the responsibility of children componets to set this based on their state.
    // It's primarily ProjectView that does this.
    let fullscreen = writable<{
        on: boolean;
        background: Color | string | null;
    }>({ on: false, background: null });
    setContext('fullscreen', fullscreen);

    $: if (typeof document !== 'undefined' && $fullscreen) {
        document.body.style.background = $fullscreen.on
            ? $fullscreen.background instanceof Color
                ? $fullscreen.background.toCSS()
                : $fullscreen.background ?? ''
            : '';
        document.body.style.color = $fullscreen.on
            ? $fullscreen.background instanceof Color
                ? $fullscreen.background.complement().toCSS()
                : ''
            : '';
    }

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
    <footer class:fullscreen={$fullscreen.on}>
        <Link nowrap tip={$locales.get((l) => l.ui.widget.home)} to="/"
            ><Emoji>💬</Emoji></Link
        >
        <Link nowrap to="/learn"
            >{$locales.get((l) => l.ui.page.learn.header)}</Link
        >
        <Link nowrap to="/projects"
            >{$locales.get((l) => l.ui.page.projects.header)}</Link
        >
        <Link nowrap to="/galleries"
            >{$locales.get((l) => l.ui.page.galleries.header)}</Link
        >
        <Link nowrap to="/donate"
            >{$locales.get((l) => l.ui.page.donate.header)}</Link
        >
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
        z-index: 1;
        gap: var(--wordplay-spacing);
        background: var(--wordplay-background);
    }
</style>
