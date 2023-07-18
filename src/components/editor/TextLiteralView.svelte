<svelte:options immutable={true} />

<script lang="ts">
    import type TextLiteral from '@nodes/TextLiteral';
    import NodeView from './NodeView.svelte';
    import { getCaret } from '../project/Contexts';
    import Adjust from './Adjust.svelte';

    export let node: TextLiteral;

    const caret = getCaret();
</script>

<NodeView node={node.text} /><NodeView
    node={node.language}
/>{#if node.getValue().text.length === 1 && $caret?.isIn(node, false)}<Adjust
        {node}
    />{/if}
