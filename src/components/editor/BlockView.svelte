<script lang="ts">
    import type Block from '@nodes/Block';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';
    import { getIsBlocks } from '@components/project/Contexts';

    interface Props {
        node: Block;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <NodeView node={node.docs} /><NodeView node={node.open} /><div
        class="indent"
        ><NodeSequenceView
            nodes={node.statements}
            direction={node.statements.length > 1 ? 'column' : 'row'}
        /></div
    ><NodeView node={node.close} />
{:else}
    <NodeView node={node.docs} /><NodeView node={node.open} /><NodeSequenceView
        nodes={node.statements}
    /><NodeView node={node.close} />
{/if}

<style>
    .indent {
        margin-left: var(--wordplay-spacing);
    }
</style>
