<script lang="ts">
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import type DocumentedExpression from '@nodes/DocumentedExpression';

    interface Props {
        node: DocumentedExpression;
        format: Format;
    }

    let { node, format }: Props = $props();

    let highlighted = $derived(node.hasAttentionEmoji());
</script>

<NodeView node={[node, 'docs']} {format} />{#if highlighted}<span
        class="attention"
        ><NodeView node={[node, 'expression']} {format} /></span
    >{:else}<NodeView node={[node, 'expression']} {format} />{/if}

<style>
    .attention {
        border-radius: var(--wordplay-editor-radius);
        background: var(--color-yellow-transparent);
        flex-direction: column;
        align-items: start;
        width: fit-content;
    }
</style>
