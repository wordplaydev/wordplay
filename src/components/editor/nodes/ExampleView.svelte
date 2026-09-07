<script lang="ts">
    import type Example from '@nodes/Example';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface ExampleProps {
        node: Example;
        format: Format;
    }

    let { node, format }: ExampleProps = $props();

    /** An example's contents are code, so they are rendered as code even when the
     *  markup around them is being rendered as prose. That is what the read-only
     *  view shows, and it saves every prose rule downstream from having to carve
     *  out an exception for what is inside a `\…\`. */
    let codeFormat = $derived(
        format.prose === true ? { ...format, prose: false } : format,
    );
</script>

<NodeView node={[node, 'open']} {format} /><NodeView
    node={[node, 'program']}
    format={codeFormat}
/><NodeView node={[node, 'close']} {format} empty="hide" /><NodeView
    node={[node, 'highlight']}
    {format}
    empty="hide"
/>
