<script lang="ts">
    import type PropertyBind from '@nodes/PropertyBind';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: PropertyBind;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'reference']} {format} /><NodeView
    node={[node, 'bind']}
    {format}
/><NodeView node={[node, 'value']} {format} />
