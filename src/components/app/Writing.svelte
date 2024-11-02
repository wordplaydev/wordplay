<script lang="ts">
    import Page from './Page.svelte';

    interface Props {
        home?: boolean;
        children?: import('svelte').Snippet;
        footer?: import('svelte').Snippet;
    }

    let { home = false, children, footer }: Props = $props();
</script>

<Page {home}>
    <div class="writing">
        {@render children?.()}
    </div>
    <div class="footer">
        {@render footer?.()}
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

    :global(p:not(:global(:last-of-type))) {
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
