<script lang="ts">
    import type Program from '@nodes/Program';
    import Block from '../blocks/Block.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    export interface ProgramProps {
        node: Program;
        format: Format;
    }

    let { node, format }: ProgramProps = $props();
</script>

{#if format.block}
    <Block style="none">
        <NodeView node={node.docs} {format} />
        <NodeSequenceView nodes={node.borrows} {format} />
        <NodeView node={node.expression} {format} />
        <NodeView node={node.end} {format} />
    </Block>
{:else}
    <NodeView node={node.docs} {format} /><NodeSequenceView
        nodes={node.borrows}
        {format}
    /><NodeView node={node.expression} {format} /><NodeView
        node={node.end}
        {format}
    />
{/if}
