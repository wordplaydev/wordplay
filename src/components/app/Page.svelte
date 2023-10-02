<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import Button from '../widgets/Button.svelte';
    import Settings from '../settings/Settings.svelte';
    import { locale } from '../../db/Database';
    import Link from './Link.svelte';

    export let fullscreen = false;

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
    <footer class:fullscreen>
        <Button
            tip={$locale.ui.widget.home}
            active={$page.route.id !== '/'}
            action={() => goto('/')}>🏠</Button
        >
        <Link to="/learn">{$locale.ui.page.learn.header}</Link>
        <Link to="/projects">{$locale.ui.page.projects.header}</Link>
        <Link to="/galleries">{$locale.ui.page.galleries.header}</Link>
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
