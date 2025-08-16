<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type ListLiteral from '@nodes/ListLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import Block from './blocks/Block.svelte';
    import Delimiter from './blocks/Delimiter.svelte';

    interface Props {
        node: ListLiteral;
    }

    let { node }: Props = $props();
    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <Block inline>
        <Delimiter token={node.open} />
        <NodeSequenceView
            nodes={node.values}
            elide
            block={node.values.map((v) => v.toWordplay()).join().length > 40}
        />
        <Delimiter token={node.close} />
        <NodeView node={node.literal} />
    </Block>
{:else}
    <NodeView node={node.open} /><NodeSequenceView
        nodes={node.values}
        elide
    /><NodeView node={node.close} /><NodeView node={node.literal} />
{/if}
