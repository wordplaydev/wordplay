<svelte:options immutable={true} />

<script lang="ts">
    import type NumberLiteral from '@nodes/NumberLiteral';
    import NodeView from './NodeView.svelte';
    import { getCaret } from '../project/Contexts';
    import Adjust from './Adjust.svelte';

    export let node: NumberLiteral;

    const caret = getCaret();
</script>

<NodeView node={node.number} /><NodeView
    node={node.unit}
    small
/>{#if $caret?.isIn(node)}<Adjust {node} />{/if}
