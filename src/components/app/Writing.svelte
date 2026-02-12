<script lang="ts">
    import { type Snippet } from 'svelte';
    import Page from './Page.svelte';

    interface Props {
        children: Snippet;
        footer?: boolean;
    }

    let { children, footer = true }: Props = $props();
</script>

<Page {footer}>
    <div class="writing">
        {@render children()}
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

    :global(p:not(:last-of-kind)) {
        margin-block-end: 1em;
    }
</style>
