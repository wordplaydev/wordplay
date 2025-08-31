<script lang="ts">
    import type FormattedLiteral from '../../../nodes/FormattedLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type { Format } from './NodeView.svelte';

    interface Props {
        node: FormattedLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView nodes={node.texts} {format} />
