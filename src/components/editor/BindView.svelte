<script lang="ts">
    import type Bind from '@nodes/Bind';
    import NodeView from './NodeView.svelte';
    import { getIsBlocks } from '@components/project/Contexts';

    interface Props {
        node: Bind;
    }

    let { node }: Props = $props();

    const blocks = getIsBlocks();
</script>

{#if $blocks}
    <div class="layout">
        <NodeView node={node.docs} />
        <div class="row"
            ><NodeView node={node.share} /><NodeView
                node={node.names}
            /><NodeView node={node.etc} /><span class="type row"
                ><NodeView node={node.dot} /><NodeView node={node.type} /></span
            ><strong><NodeView node={node.colon} /></strong
            >{#if node.value}<NodeView node={node.value} />{/if}
        </div>
    </div>
{:else}
    <NodeView node={node.docs} /><NodeView node={node.share} /><NodeView
        node={node.names}
    /><NodeView node={node.etc} /><span class="type"
        ><NodeView node={node.dot} /><NodeView node={node.type} /></span
    ><strong><NodeView node={node.colon} /></strong>{#if node.value}<NodeView
            node={node.value}
        />{/if}
{/if}

<style>
    .type {
        font-style: italic;
        font-size: smaller;
    }

    .row {
        display: flex;
        flex-direction: row;
        align-items: baseline;
    }

    .layout {
        display: flex;
        flex-direction: column;
    }
</style>
