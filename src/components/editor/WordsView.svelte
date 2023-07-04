<svelte:options immutable={true} />

<script lang="ts">
    import type Words from '@nodes/Words';
    import NodeView from './NodeView.svelte';
    import { getCaret } from '../project/Contexts';

    export let node: Words;

    let caret = getCaret();

    $: editing = $caret?.isIn(node);
</script>

<span class={node.getFormat()}
    >{#if editing}<NodeView node={node.open} />{/if}<NodeView
        node={node.words}
    />{#if editing}<NodeView node={node.close} />{/if}
</span>

<style>
    .italic {
        font-style: italic;
    }
    .underline {
        text-decoration: underline;
    }
    .light {
        font-weight: 300;
    }
    .bold {
        font-weight: bold;
    }
    .extra {
        font-weight: 900;
    }
</style>
