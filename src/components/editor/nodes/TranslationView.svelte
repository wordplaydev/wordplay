<script lang="ts">
    import type Translation from '../../../nodes/Translation';
    import Block from '../blocks/Block.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Translation;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#snippet view()}
    <NodeView node={node.open} {format} /><NodeSequenceView
        nodes={node.segments}
        {format}
    /><NodeView node={node.close} {format} /><NodeView
        node={node.language}
        {format}
    /><NodeView node={node.separator} {format} />
{/snippet}

{#if format.block}
    <Block style="none" children={view}></Block>
{:else}
    {@render view()}
{/if}
