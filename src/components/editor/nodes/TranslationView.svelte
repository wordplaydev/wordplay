<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Translation from '../../../nodes/Translation';
    import Block from '../blocks/Block.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Translation;
        format: Format;
    }

    let { node, format }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <Block inline style="none">
        <NodeView node={node.open} {format} /><NodeSequenceView
            nodes={node.segments}
            {format}
        /><NodeView node={node.close} {format} /><NodeView
            node={node.language}
            {format}
        /><NodeView node={node.separator} {format} />
    </Block>
{:else}
    <NodeView node={node.open} {format} /><NodeSequenceView
        nodes={node.segments}
        {format}
    /><NodeView node={node.close} {format} /><NodeView
        node={node.language}
        {format}
    /><NodeView node={node.separator} {format} />
{/if}
