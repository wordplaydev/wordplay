<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Language from '@nodes/Language';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Language;
        format: Format;
    }

    let { node, format }: Props = $props();

    const blocks = getIsBlocks();
</script>

<em class="language {$blocks ? 'blocks' : ''}"
    ><NodeView node={node.slash} {format} /><NodeView
        node={node.language}
        {format}
    /><NodeView node={node.dash} {format} /><NodeView
        node={node.region}
        {format}
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
