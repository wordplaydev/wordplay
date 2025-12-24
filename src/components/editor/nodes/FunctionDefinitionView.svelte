<script lang="ts">
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import Flow from '../blocks/Flow.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: FunctionDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#snippet docs()}
    <NodeView node={[node, 'docs']} {format} empty="menu" /><NodeView
        node={[node, 'share']}
        {format}
        empty="hide"
    />
{/snippet}

{#if format.block}
    {#if node.docs}{@render docs()}{/if}
    <Flow direction="row"
        >{#if node.docs === undefined}{@render docs()}{/if}<NodeView
            node={[node, 'fun']}
            {format}
        /><NodeView node={[node, 'names']} {format} /><NodeView
            node={[node, 'types']}
            {format}
            empty="hide"
        /><NodeView node={[node, 'open']} {format} /><NodeSequenceView
            {node}
            field="inputs"
            {format}
            empty="menu"
        /><NodeView node={[node, 'close']} {format} /><NodeView
            node={[node, 'dot']}
            {format}
            empty="hide"
        /><NodeView node={[node, 'output']} {format} />
    </Flow>
    <Flow direction="column" indent>
        <NodeView node={[node, 'expression']} {format} empty="label" />
    </Flow>
{:else}
    <NodeView node={[node, 'docs']} {format} /><NodeView
        node={[node, 'share']}
        {format}
    /><NodeView node={[node, 'fun']} {format} /><NodeView
        node={[node, 'names']}
        {format}
    /><NodeView node={[node, 'types']} {format} /><NodeView
        node={[node, 'open']}
        {format}
    /><NodeSequenceView {node} field="inputs" {format} empty="menu" /><NodeView
        node={[node, 'close']}
        {format}
    /><NodeView node={[node, 'dot']} {format} /><NodeView
        node={[node, 'output']}
        {format}
        empty="hide"
    /><NodeView node={[node, 'expression']} {format} />
{/if}
