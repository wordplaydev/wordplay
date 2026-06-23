<script lang="ts">
    import Flow from '@components/editor/blocks/Flow.svelte';
    import type { Snippet } from 'svelte';

    interface Props {
        /** In block layout the collapsed header is wrapped in a row Flow (as the
         *  expanded form is); inline it renders bare. The single place that split
         *  lives so each container view writes its collapsed header content once
         *  rather than once per layout. */
        block: boolean;
        /** The collapsed header content (toggle + open delimiter + ellipsis +
         *  close delimiter + any trailing node). Kept in the caller so its
         *  `[node, field]` NodeView tuples stay concretely typed. */
        header: Snippet;
    }

    let { block, header }: Props = $props();
</script>

{#if block}<Flow direction="row">{@render header()}</Flow>{:else}{@render header()}{/if}
