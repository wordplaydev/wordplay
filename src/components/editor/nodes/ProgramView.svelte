<script lang="ts">
    import type Program from '@nodes/Program';
    import Column from '../blocks/Column.svelte';
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
    {#if format.editable}
        {@render docs()}
        <Column
            ><NodeSequenceView
                {node}
                field="borrows"
                {format}
                empty="hide"
            /><NodeView node={[node, 'expression']} {format} /><NodeView
                node={[node, 'end']}
                {format}
                empty="hide"
            />
        </Column>
    {:else}
        {#if node.docs && node.docs.docs.length > 0}{@render docs()}{/if}
        <NodeSequenceView
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
{:else}
    <NodeView node={[node, 'docs']} {format} empty="menu" /><NodeSequenceView
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
