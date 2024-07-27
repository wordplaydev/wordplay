<svelte:options immutable={true} />

<script lang="ts">
    import type Words from '@nodes/Words';
    import NodeView from './NodeView.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { isBlocks } from '@components/project/Contexts';

    export let node: Words;

    const blocks = isBlocks();
</script>

<span class="words {$blocks ? 'blocks' : ''} {node.getFormat()}"
    ><NodeView node={node.open} /><NodeSequenceView
        nodes={node.getNodeSegments()}
    /><NodeView node={node.close} />
</span>

<style>
    .words.blocks {
        display: flex;
        flex-direction: row;
    }

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
