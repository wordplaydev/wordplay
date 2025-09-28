<script lang="ts">
    import type Match from '@nodes/Match';
    import Column from '../blocks/Column.svelte';
    import Row from '../blocks/Row.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Match;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <Row>
        <NodeView node={node.value} {format} /><NodeView
            node={node.question}
            {format}
        />
    </Row>
    <Column indent>
        <NodeSequenceView block {node} field="cases" {format} /><NodeView
            node={node.other}
            {format}
        />
    </Column>
{:else}
    <NodeView node={node.value} {format} /><NodeView
        node={node.question}
        {format}
    /><NodeSequenceView {node} field="cases" {format} /><NodeView
        node={node.other}
        {format}
    />
{/if}
