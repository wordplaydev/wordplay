<script lang="ts">
    import { getIsBlocks } from '@components/project/Contexts';
    import type Translation from '../../nodes/Translation';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import Block from './blocks/Block.svelte';

    interface Props {
        node: Translation;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <Block inline style="none">
        <NodeView node={node.open} /><NodeSequenceView
            nodes={node.segments}
        /><NodeView node={node.close} /><NodeView
            node={node.language}
        /><NodeView node={node.separator} />
    </Block>
{:else}
    <NodeView node={node.open} /><NodeSequenceView
        nodes={node.segments}
    /><NodeView node={node.close} /><NodeView node={node.language} /><NodeView
        node={node.separator}
    />
{/if}
