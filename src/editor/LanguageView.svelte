<svelte:options immutable={true} />

<script lang="ts">
    import type Language from '../nodes/Language';
    import { getCaret, getRoot } from './util/Contexts';
    import NodeView from './NodeView.svelte';
    import { project } from '../models/stores';
    import Program from '../nodes/Program';

    export let node: Language;

    let root = getRoot();
    let caret = getCaret();
    $: parent = $caret?.source.get(node)?.getParent();
    $: show =
        !($root?.node instanceof Program) ||
        (parent && $caret && $caret.isIn(parent));
</script>

{#if show && $project.evaluator.isPlaying()}<em
        ><NodeView node={node.slash} /><NodeView node={node.lang} /></em
    >{/if}
