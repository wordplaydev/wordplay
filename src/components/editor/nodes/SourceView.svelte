<script lang="ts">
    import type Source from '../../../nodes/Source';
    import Block from '../blocks/Block.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Source;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#snippet children()}
    <NodeView node={node.expression} {format} />
{/snippet}

{#if format.block}
    <Block block {children}></Block>
{:else}
    {@render children()}
{/if}
