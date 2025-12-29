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

<NodeView node={[node, 'open']} {format} /><span
    class="words {format.block ? 'blocks' : ''} {node.getFormat()}"
    ><NodeSequenceView
        {node}
        field="segments"
        filtered={node.getNodeSegments()}
        empty="menu"
        {format}
    /></span
><NodeView node={[node, 'close']} {format} empty="hide" />

<style>
    .words.blocks {
        display: flex;
        flex-direction: row;
        align-items: baseline;
    }

    .italic :global(.Token) {
        font-style: italic;
    }
    .underline :global(.Token) {
        text-decoration: underline;
    }
    .light :global(.Token) {
        font-weight: 300;
    }
    .bold :global(.Token) {
        font-weight: bold;
    }
    .extra :global(.Token) {
        font-weight: 900;
    }
</style>
