<script lang="ts">
    import type FormattedLiteral from '@nodes/FormattedLiteral';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import type { Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: FormattedLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView {node} field="texts" {format} empty="label" />
