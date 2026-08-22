<script lang="ts">
    import type FormattedType from '@nodes/FormattedType';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: FormattedType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<!-- A derived locale is a function of an operation's operands, not a child
    node, so there is nothing to render until it's applied to a call. -->
<NodeView
    node={[node, 'tick']}
    {format}
/>{#if !node.hasDerivedLanguage()}<NodeView
        node={[node, 'language']}
        {format}
        empty="hide"
    />{/if}
