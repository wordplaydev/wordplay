<script lang="ts">
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import type ExternalExample from '@nodes/ExternalExample';

    interface Props {
        node: ExternalExample;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- The whole `\tag|code\tag|code\` is captured as one token and never tokenized,
     so it renders as that token; the read-only view that highlights a variant per
     the reader's contrast language is components/concepts/ExternalExampleView. -->
<NodeView node={[node, 'example']} {format} />
