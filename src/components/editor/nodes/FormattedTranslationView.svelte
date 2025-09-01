<script lang="ts">
    import type FormattedTranslation from '../../../nodes/FormattedTranslation';
    import Block from '../blocks/Block.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: FormattedTranslation;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#snippet children()}
    <NodeView node={node.open} {format} /><NodeView
        node={node.markup}
        {format}
    /><NodeView node={node.close} {format} /><NodeView
        node={node.language}
        {format}
    /><NodeView node={node.separator} {format} />
{/snippet}

{#if format.block}
    <Block {children} />
{:else}
    {@render children()}
{/if}
