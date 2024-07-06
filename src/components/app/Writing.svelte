<script lang="ts">
    import Page from './Page.svelte';

    export let home = false;
</script>

<Page {home}>
    <div class="writing">
        <slot />
    </div>
    <div class="footer">
        <slot name="footer" />
    </div>
</Page>

<style>
    .writing {
        margin-inline-start: auto;
        margin-inline-end: auto;
        width: 70%;
        max-width: 40em;
        text-align: start;
        margin-block-start: 4em;
        margin-block-end: 4em;
    }

    :global(p:not(:last-of-type)) {
        margin-block-end: 1em;
    }

    .footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-items: center;
        width: 100vw;
        background: var(--wordplay-alternating-color);
    }
</style>
