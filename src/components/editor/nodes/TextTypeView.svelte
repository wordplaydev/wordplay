<script lang="ts">
    import type TextType from '@nodes/TextType';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TextType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- A derived locale is a function of an operation's operands, not a child
    node, so there is nothing to render until it's applied to a call. -->
<NodeView node={[node, 'open']} {format} /><NodeView
    node={[node, 'text']}
    empty="hide"
    {format}
/><NodeView
    node={[node, 'close']}
    {format}
/>{#if !node.hasDerivedLanguage()}<NodeView
        node={[node, 'language']}
        {format}
        empty="menu"
    />{/if}
