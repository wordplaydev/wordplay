<script lang="ts">
    import type Language from '@nodes/Language';
    import NodeView, { type Format } from './NodeView.svelte';

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
    /><NodeView node={[node, 'dash']} {format} empty="hide" /><NodeView
        node={[node, 'region']}
        {format}
        empty="hide"
    /></em
>

<style>
    .language {
        font-size: small;
    }

    .language.blocks {
        display: flex;
        flex-direction: row;
    }
</style>
