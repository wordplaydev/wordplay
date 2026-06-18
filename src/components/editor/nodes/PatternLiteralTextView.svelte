<script lang="ts">
    import type PatternLiteralText from '@nodes/PatternLiteralText';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    /** A literal run of text matched verbatim inside a pattern. */
    interface Props {
        node: PatternLiteralText;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'text']} {format} />
