<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Conditional from '@nodes/Conditional';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Conditional;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <NodeView node={node.condition} /><NodeView node={node.question} />
    <NodeView node={node.yes} /><NodeView node={node.no} />
{:else}
    <span class="condition"
        ><NodeView node={node.condition} /><NodeView
            node={node.question}
        /></span
    ><NodeView node={node.yes} /><NodeView node={node.no} />
{/if}
