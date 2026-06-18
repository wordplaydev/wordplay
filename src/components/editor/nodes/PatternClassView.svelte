<script lang="ts">
    import type PatternClass from '@nodes/PatternClass';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A grapheme class atom (`◌`/`_`/`#`/`␣`) with an optional refining
     *  property (e.g. `_/greek`). */
    interface Props {
        node: PatternClass;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'base']} {format} /><NodeView
    node={[node, 'property']}
    {format}
    empty="hide"
/>
