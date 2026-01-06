<script lang="ts">
    import type KeyValue from '@nodes/KeyValue';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: KeyValue;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'key']} {format} /><NodeView
    node={[node, 'bind']}
    {format}
/><NodeView node={[node, 'value']} {format} />
