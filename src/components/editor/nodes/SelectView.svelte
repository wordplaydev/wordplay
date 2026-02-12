<script lang="ts">
    import type Select from '@nodes/Select';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Select;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'table']} {format} /><NodeView
    node={[node, 'row']}
    {format}
/><NodeView node={[node, 'query']} {format} />
