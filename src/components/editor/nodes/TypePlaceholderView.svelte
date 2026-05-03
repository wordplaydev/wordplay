<script lang="ts">
    import type TypePlaceholder from '@nodes/TypePlaceholder';
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TypePlaceholder;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'placeholder']} {format} />
{#if format.editable && format.block}<MenuTrigger anchor={node} />{/if}
