<svelte:options immutable={true} />

<script lang="ts">
    import type Doc from '../nodes/Doc';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: Doc;
</script>

<span class="doc">
    <NodeView node={node.open} /><NodeSequenceView
        nodes={node.paragraphs}
    /><NodeView node={node.close} /><NodeView node={node.lang} />
</span>

<style>
    .doc {
        color: var(--wordplay-doc-color);
    }
</style>
