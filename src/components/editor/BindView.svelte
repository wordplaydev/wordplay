<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Bind from '@nodes/Bind';
    import NodeView from './NodeView.svelte';
    import Block from './blocks/Block.svelte';
    import Delimiter from './blocks/Delimiter.svelte';

    interface Props {
        node: Bind;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <Block style="none">
        <NodeView node={node.docs} />
        <Block inline style="definition">
            <NodeView node={node.share} />
            <NodeView node={node.names} />
            <NodeView node={node.etc} />
            <span class="type">
                <NodeView node={node.dot} />
                <NodeView node={node.type} />
            </span>
            <Delimiter token={node.colon} />
            {#if node.value}<NodeView node={node.value} />{/if}
        </Block>
    </Block>
{:else}
    <NodeView node={node.docs} /><NodeView node={node.share} /><NodeView
        node={node.names}
    /><NodeView node={node.etc} /><span class="type"
        ><NodeView node={node.dot} /><NodeView node={node.type} /></span
    ><strong><NodeView node={node.colon} /></strong>{#if node.value}<NodeView
            node={node.value}
        />{/if}
{/if}

<style>
    .type {
        font-style: italic;
        font-size: smaller;
    }
</style>
