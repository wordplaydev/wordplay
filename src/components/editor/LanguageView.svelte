<script lang="ts">
    import type Language from '@nodes/Language';
    import NodeView from './NodeView.svelte';
    import { getIsBlocks } from '@components/project/Contexts';

    interface Props {
        node: Language;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

<em class="language {$blocks ? 'blocks' : ''}"
    ><NodeView node={node.slash} /><NodeView node={node.language} /><NodeView
        node={node.dash}
    /><NodeView node={node.region} /></em
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
