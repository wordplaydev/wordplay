<script lang="ts">
    import Settings from '../settings/Settings.svelte';
    import Link from './Link.svelte';
</script>

<div class="page">
    <main>
        <slot />
    </main>
    <footer>
        <div class="beta"
            ><Link external to="https://github.com/amyjko/wordplay/milestone/1"
                >beta</Link
            ></div
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

    .beta {
        font-style: italic;
    }

    main {
        display: flex;
        flex-direction: column;
        align-items: center;
        overflow: scroll;
        flex: 1;
        min-height: 0;
    }

    main:focus {
        outline: none !important;
    }

    footer {
        display: flex;
        flex-direction: row;
        width: 100%;
        max-width: 100%;
        overflow: scroll;
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        background: var(--wordplay-background);
        z-index: 1;
    }
</style>
