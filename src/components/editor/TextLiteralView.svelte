<svelte:options immutable={true} />

<script lang="ts">
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type TextLiteral from '../../nodes/TextLiteral';

    export let node: TextLiteral;
</script>

<NodeSequenceView nodes={node.texts} />
