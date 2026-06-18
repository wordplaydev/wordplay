<script lang="ts">
    import type PatternSequence from '@nodes/PatternSequence';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import { type Format } from '@components/editor/nodes/NodeView.svelte';

    /** A sequence of pattern items, interleaved with `|` alternation tokens. The
     *  `parts` list holds both, so NodeSequenceView renders them in order; in
     *  blocks mode it also provides drag/drop and append affordances. */
    interface Props {
        node: PatternSequence;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeSequenceView {node} field="parts" {format} empty="label" wrap />
