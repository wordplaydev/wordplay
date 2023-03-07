<svelte:options immutable={true} />

<script lang="ts">
    import type Language from '@nodes/Language';
    import { getCaret, getEvaluator, getRoot } from '../project/Contexts';
    import NodeView from './NodeView.svelte';
    import Program from '@nodes/Program';

    export let node: Language;

    let evaluator = getEvaluator();
    let root = getRoot();
    let caret = getCaret();
    $: parent = $caret?.source.get(node)?.getParent();
    $: show =
        !($root?.node instanceof Program) ||
        (parent && $caret && $caret.isIn(parent));
</script>

{#if show && $evaluator.isPlaying()}<em
        ><NodeView node={node.slash} /><NodeView node={node.lang} /></em
    >{/if}
