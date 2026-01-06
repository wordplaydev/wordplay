<script lang="ts">
    import type Conditional from '@nodes/Conditional';
    import Flow from '../blocks/Flow.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Conditional;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <Flow direction="row">
        <NodeView node={[node, 'condition']} {format} /><NodeView
            node={[node, 'question']}
            {format}
        />
    </Flow>
    <Flow direction="column" indent>
        <NodeView node={[node, 'yes']} {format} /><NodeView
            node={[node, 'no']}
            {format}
        /></Flow
    >
{:else}
    <NodeView node={[node, 'condition']} {format} /><NodeView
        node={[node, 'question']}
        {format}
    /><NodeView node={[node, 'yes']} {format} /><NodeView
        node={[node, 'no']}
        {format}
    />
{/if}
