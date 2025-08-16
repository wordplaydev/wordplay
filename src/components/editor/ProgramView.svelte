<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Program from '@nodes/Program';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import Block from './blocks/Block.svelte';

    interface Props {
        node: Program;
    }

    let { node }: Props = $props();
    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <Block style="none">
        <NodeView node={node.docs} />
        <NodeSequenceView nodes={node.borrows} />
        <NodeView node={node.expression} />
        <NodeView node={node.end} />
    </Block>
{:else}
    <NodeView node={node.docs} /><NodeSequenceView
        nodes={node.borrows}
    /><NodeView node={node.expression} /><NodeView node={node.end} />
{/if}
