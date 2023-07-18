<svelte:options immutable={true} />

<script lang="ts">
    import type BooleanLiteral from '@nodes/BooleanLiteral';
    import NodeView from './NodeView.svelte';
    import Adjust from './Adjust.svelte';
    import { getCaret } from '../project/Contexts';

    export let node: BooleanLiteral;

    const caret = getCaret();
</script>

<NodeView node={node.value} />{#if $caret?.isIn(node, false)}<Adjust
        {node}
    />{/if}
