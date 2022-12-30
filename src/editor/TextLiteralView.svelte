<svelte:options immutable={true} />

<script lang="ts">
    import type TextLiteral from '../nodes/TextLiteral';
    import NodeView from './NodeView.svelte';

    export let node: TextLiteral;
</script>

<NodeView node={node.text} /><NodeView node={node.format} />
