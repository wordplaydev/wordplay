<script lang="ts">
    import type Words from '@nodes/Words';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface WordProps {
        node: Words;
        format: Format;
    }

    let { node, format }: WordProps = $props();
</script>

<span class="words {format.block ? 'blocks' : ''} {node.getFormat()}"
    ><NodeView node={[node, 'open']} {format} /><NodeSequenceView
        {node}
        field="segments"
        filtered={node.getNodeSegments()}
        empty="label"
        {format}
    /><NodeView node={[node, 'close']} {format} />
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
