<svelte:options immutable={true} />

<script lang="ts">
    import type Markup from '../../nodes/Markup';
    import NodeSequenceView from './NodeSequenceView.svelte';

    export let node: Markup;
</script>

<NodeSequenceView nodes={node.paragraphs} />
