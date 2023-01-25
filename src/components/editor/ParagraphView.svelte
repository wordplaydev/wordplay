<svelte:options immutable={true} />

<script lang="ts">
    import type Paragraph from '@nodes/Paragraph';
    import NodeSequenceView from './NodeSequenceView.svelte';

    export let node: Paragraph;
</script>

<NodeSequenceView nodes={node.content} />
