<script lang="ts">
    import type TextLiteral from '@nodes/TextLiteral';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TextLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView {node} field="texts" {format} empty="label" />
