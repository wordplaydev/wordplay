<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Conditional from '@nodes/Conditional';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Conditional;
        format: Format;
    }

    let { node, format }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <NodeView node={node.condition} {format} /><NodeView
        node={node.question}
        {format}
    />
    <NodeView node={node.yes} {format} /><NodeView node={node.no} {format} />
{:else}
    <span class="condition"
        ><NodeView node={node.condition} {format} /><NodeView
            node={node.question}
            {format}
        /></span
    ><NodeView node={node.yes} {format} /><NodeView node={node.no} {format} />
{/if}
