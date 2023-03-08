<svelte:options immutable={true} />

<script lang="ts">
    import type Language from '@nodes/Language';
    import { getCaret, getEvaluator } from '../project/Contexts';
    import NodeView from './NodeView.svelte';

    export let node: Language;

    let evaluator = getEvaluator();
    let caret = getCaret();
    $: parent = $caret?.source.root.getParent(node);
    $: show = $caret === undefined || (parent && $caret.isIn(parent));
</script>

{#if show && $evaluator?.isPlaying()}<em
        ><NodeView node={node.slash} /><NodeView node={node.lang} /></em
    >{/if}
