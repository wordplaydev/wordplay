<script lang="ts">
    import type FormattedType from '@nodes/FormattedType';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: FormattedType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'tick']} {format} />
