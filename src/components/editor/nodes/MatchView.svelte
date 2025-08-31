<script lang="ts">
    import type Match from '@nodes/Match';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Match;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.value} {format} /><NodeView
    node={node.question}
    {format}
/><NodeSequenceView nodes={node.cases} {format} /><NodeView
    node={node.other}
    {format}
/>
