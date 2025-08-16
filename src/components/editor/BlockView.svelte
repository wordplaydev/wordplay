<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Block from '@nodes/Block';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import BlockUI from './blocks/Block.svelte';
    import Delimiter from './blocks/Delimiter.svelte';

    interface Props {
        node: Block;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <BlockUI
        inline={node.statements.length === 1}
        style={node.open === undefined ? 'none' : 'back'}
    >
        <NodeView node={node.docs} />
        <Delimiter token={node.open} />
        <NodeSequenceView
            nodes={node.statements}
            block={node.statements.length > 1}
            indent
        />
        <Delimiter token={node.close} />
    </BlockUI>
{:else}
    <NodeView node={node.docs} /><NodeView node={node.open} /><NodeSequenceView
        nodes={node.statements}
    /><NodeView node={node.close} />
{/if}
