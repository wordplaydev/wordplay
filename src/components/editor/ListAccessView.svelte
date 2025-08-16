<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type ListAccess from '@nodes/ListAccess';
    import NodeView from './NodeView.svelte';
    import Block from './blocks/Block.svelte';

    interface Props {
        node: ListAccess;
    }

    let { node }: Props = $props();
    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <Block inline>
        <NodeView node={node.list} /><NodeView node={node.open} /><NodeView
            node={node.index}
        /><NodeView node={node.close} />
    </Block>
{:else}
    <NodeView node={node.list} /><NodeView node={node.open} /><NodeView
        node={node.index}
    /><NodeView node={node.close} />
{/if}
