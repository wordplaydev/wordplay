<script lang="ts">
    import Settings from '../settings/Settings.svelte';
</script>

<div class="page">
    <main>
        <slot />
    </main>
    <footer>
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
    }
</style>
