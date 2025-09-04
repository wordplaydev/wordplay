<script lang="ts">
    import type Paragraph from '@nodes/Paragraph';
    import NodeSequenceView from './NodeSequenceView.svelte';

    interface Props {
        node: Paragraph;
    }

    let { node }: Props = $props();
</script>

<NodeSequenceView nodes={node.getNodeSegments()} />
