<script lang="ts">
    import type Program from '@nodes/Program';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    export interface ProgramProps {
        node: Program;
        format: Format;
    }

    let { node, format }: ProgramProps = $props();
</script>

{#if format.block}
    <NodeSequenceView {node} field="borrows" {format} empty="hide" /><NodeView
        node={[node, 'expression']}
        {format}
    /><NodeView node={[node, 'end']} {format} empty="hide" />
{:else}
    <NodeSequenceView {node} field="borrows" {format} empty="hide" /><NodeView
        node={[node, 'expression']}
        {format}
    /><NodeView node={[node, 'end']} {format} empty="hide" />
{/if}
