<script lang="ts">
    import type Input from '@nodes/Input';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Input;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<small><NodeView node={[node, 'name']} {format} /></small><NodeView
    node={[node, 'bind']}
    {format}
/><NodeView node={[node, 'value']} {format} />
