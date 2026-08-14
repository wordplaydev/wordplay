<script lang="ts">
    import type Language from '@nodes/Language';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Language;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<em class="language {format.block ? 'blocks' : ''}"
    ><NodeView node={[node, 'slash']} {format} /><NodeView
        node={[node, 'language']}
        {format}
    /><NodeSequenceView
        {node}
        field="extras"
        {format}
        empty="hide"
    /><NodeView node={[node, 'dash']} {format} empty="hide" /><NodeView
        node={[node, 'region']}
        {format}
        empty="hide"
    /><NodeSequenceView
        {node}
        field="regionExtras"
        {format}
        empty="hide"
    /></em
>

<style>
    /* Relative, not the `small` keyword, so it tracks --wordplay-font-size and the
       editor's --zoom rather than the browser's base size. */
    .language {
        font-size: 0.85em;
    }

    .language.blocks {
        display: flex;
        flex-direction: row;
    }
</style>
