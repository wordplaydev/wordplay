<svelte:options immutable={true} />

<script lang="ts">
    import type Words from '../nodes/Words';
    import NodeView from './NodeView.svelte';
    import { getCaret } from './util/Contexts';

    export let node: Words;

    let caret = getCaret();

    $: editing = $caret?.isIn(node);
</script>

<span
    class:italic={node.isItalic()}
    class:bold={node.isBold()}
    class:extra={node.isExtra()}
    >{#if editing}<NodeView node={node.open} />{/if}<NodeView
        node={node.words}
    />{#if editing}<NodeView node={node.close} />{/if}
</span>

<style>
    .italic {
        font-style: italic;
    }
    .bold {
        font-weight: bold;
    }
    .extra {
        font-weight: 700;
    }
</style>
