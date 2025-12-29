<script lang="ts">
    import type TextLiteral from '../../../nodes/TextLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { type Format } from './NodeView.svelte';

    interface Props {
        node: TextLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView {node} field="texts" {format} empty="label" />
