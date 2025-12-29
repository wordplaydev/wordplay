<script lang="ts">
    import type Match from '@nodes/Match';
    import Flow from '../blocks/Flow.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Match;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <Flow direction="row">
        <NodeView node={[node, 'value']} {format} /><NodeView
            node={[node, 'question']}
            {format}
        />
    </Flow>
    <Flow direction="column" indent>
        <NodeSequenceView
            block="block"
            {node}
            field="cases"
            {format}
            empty="label"
        /><NodeView node={[node, 'other']} {format} />
    </Flow>
{:else}
    <NodeView node={[node, 'value']} {format} /><NodeView
        node={[node, 'question']}
        {format}
    /><NodeSequenceView {node} field="cases" {format} empty="label" /><NodeView
        node={[node, 'other']}
        {format}
    />
{/if}
