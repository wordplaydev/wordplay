<script lang="ts">
    import type Markup from '../../../nodes/Markup';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { type Format } from './NodeView.svelte';

    interface Props {
        node: Markup;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView {node} field="paragraphs" {format} empty="label" />
