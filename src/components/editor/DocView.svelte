<script lang="ts">
    import type Doc from '@nodes/Doc';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: Doc;
    }

    let { node }: Props = $props();
</script>

<span class="pilcrow start"><NodeView node={node.open} /></span><NodeView
    node={node.markup}
/><span class="pilcrow end"><NodeView node={node.close} /></span><NodeView
    node={node.language}
/><NodeView node={node.separator} />

<style>
    .pilcrow {
        display: inline-block;
    }

    .start {
        margin-inline-end: var(--wordplay-spacing);
    }

    .end {
        transform: scale(-1, 1);
        margin-inline-start: var(--wordplay-spacing);
    }
</style>
