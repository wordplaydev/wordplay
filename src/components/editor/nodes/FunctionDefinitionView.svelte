<script lang="ts">
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import Flow from '@components/editor/blocks/Flow.svelte';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';
    import { isVerticalList } from '@components/editor/nodes/verticalLayout';

    interface Props {
        node: FunctionDefinition;
        format: Format;
    }

    let { node, format }: Props = $props();

    let vertical = $derived(
        format.block && isVerticalList(node.inputs, format.spaces),
    );
</script>

{#snippet docs()}
    <NodeView node={[node, 'docs']} {format} empty="menu" /><NodeView
        node={[node, 'share']}
        {format}
        empty="hide"
    />
{/snippet}

{#if format.block}
    {#if !node.docs.isEmpty()}{@render docs()}{/if}
    {#if vertical}
        <Flow direction="column">
            <Flow direction="row"
                >{#if node.docs.isEmpty()}{@render docs()}{/if}<NodeView
                    node={[node, 'fun']}
                    {format}
                /><NodeView node={[node, 'names']} {format} /><NodeView
                    node={[node, 'types']}
                    {format}
                    empty="hide"
                /><NodeView node={[node, 'open']} {format} />
            </Flow>
            <Flow direction="row" indent>
                <NodeSequenceView
                    {node}
                    field="inputs"
                    {format}
                    empty="menu"
                    direction="block"
                    wrap={false}
                    breaks={false}
                />
            </Flow>
            <Flow direction="row"
                ><NodeView
                    node={[node, 'close']}
                    {format}
                /><NodeView
                    node={[node, 'dot']}
                    {format}
                    empty="hide"
                /><NodeView node={[node, 'output']} {format} />
            </Flow>
        </Flow>
    {:else}
        <Flow direction="row"
            >{#if node.docs.isEmpty()}{@render docs()}{/if}<NodeView
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
                direction="inline"
                wrap
                breaks
            /><NodeView node={[node, 'close']} {format} /><NodeView
                node={[node, 'dot']}
                {format}
                empty="hide"
            /><NodeView node={[node, 'output']} {format} />
        </Flow>
    {/if}
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
