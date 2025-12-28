<script lang="ts">
    import type StructureDefinition from '@nodes/StructureDefinition';
    import Flow from '../blocks/Flow.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: StructureDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#snippet docs()}
    <NodeView node={[node, 'docs']} {format} empty="menu" />
{/snippet}

{#if format.block}
    <Flow direction="column">
        {#if !node.docs.isEmpty()}{@render docs()}{/if}
        <Flow direction="row">
            {#if node.docs.isEmpty()}{@render docs()}{/if}
            <NodeView node={[node, 'share']} {format} empty="hide" /><NodeView
                node={[node, 'type']}
                {format}
                empty="hide"
            /><NodeView node={[node, 'names']} {format} /><NodeSequenceView
                {node}
                field="interfaces"
                {format}
                empty="menu"
            /><NodeView node={[node, 'types']} {format} empty="hide" /><NodeView
                node={[node, 'open']}
                {format}
            /><NodeSequenceView
                {node}
                field="inputs"
                {format}
                empty="label"
            /><NodeView node={[node, 'close']} {format} />
            {#if node.expression === undefined}<NodeView
                    node={[node, 'expression']}
                    {format}
                />{/if}
        </Flow>
        {#if node.expression !== undefined}
            <Flow direction="column" indent
                ><NodeView node={[node, 'expression']} {format} /></Flow
            >
        {/if}
    </Flow>
{:else}
    <NodeView node={[node, 'docs']} {format} /><NodeView
        node={[node, 'share']}
        {format}
    /><NodeView node={[node, 'type']} {format} /><NodeView
        node={[node, 'names']}
        {format}
    /><NodeSequenceView
        {node}
        field="interfaces"
        {format}
        empty="menu"
    /><NodeView node={[node, 'types']} {format} /><NodeView
        node={[node, 'open']}
        {format}
    /><NodeSequenceView {node} field="inputs" {format} empty="label" /><NodeView
        node={[node, 'close']}
        {format}
    /><NodeView node={[node, 'expression']} {format} />
{/if}
