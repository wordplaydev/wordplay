<script lang="ts">
    import Page from './Page.svelte';
</script>

<Page>
    <div class="writing">
        <slot />
    </div>
</Page>

<style>
    .writing {
        padding-inline-start: 20%;
        width: 80%;
        text-align: start;
        margin-block-start: 4em;
        margin-block-end: 4em;
    }

    .writing :global(p) {
        max-width: 30em;
        margin-inline-start: var(--wordplay-spacing);
    }

    :global(p:not(:last-of-type)) {
        margin-block-end: 1em;
    }
</style>
