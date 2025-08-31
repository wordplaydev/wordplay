<script lang="ts">
    import type Names from '@nodes/Names';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { type Format } from './NodeView.svelte';

    interface Props {
        node: Names;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView nodes={node.names} {format} />
