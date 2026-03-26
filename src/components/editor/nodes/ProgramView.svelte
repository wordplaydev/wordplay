<script lang="ts">
    import type Program from '@nodes/Program';
    import Flow from '../blocks/Flow.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    export interface ProgramProps {
        node: Program;
        format: Format;
    }

    let { node, format }: ProgramProps = $props();
</script>

{#snippet docs()}
    <NodeView node={[node, 'docs']} {format} empty="menu" />
{/snippet}

{#if format.block}
    {#if !node.docs.isEmpty()}{@render docs()}{/if}
    <NodeSequenceView {node} field="borrows" {format} empty="hide" />
    <Flow direction="row">
        {#if node.docs.isEmpty()}{@render docs()}{/if}<NodeView
            node={[node, 'expression']}
            {format}
        /><NodeView node={[node, 'end']} {format} empty="hide" />
    </Flow>
{:else}
    <NodeView node={[node, 'docs']} {format} /><NodeSequenceView
        {node}
        field="borrows"
        {format}
        empty="hide"
    /><NodeView node={[node, 'expression']} {format} /><NodeView
        node={[node, 'end']}
        {format}
        empty="hide"
    />
{/if}
