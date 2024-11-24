<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Translation from '../../nodes/Translation';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { getIsBlocks } from '@components/project/Contexts';

    interface Props {
        node: Translation;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <NodeView node={node.open} /><NodeSequenceView
        nodes={node.segments}
    /><NodeView node={node.close} /><NodeView node={node.language} /><NodeView
        node={node.separator}
    />
{:else}
    <NodeView node={node.open} /><NodeSequenceView
        nodes={node.segments}
    /><NodeView node={node.close} /><NodeView node={node.language} /><NodeView
        node={node.separator}
    />
{/if}
