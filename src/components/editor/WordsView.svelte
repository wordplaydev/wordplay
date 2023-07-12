<svelte:options immutable={true} />

<script lang="ts">
    import type Words from '@nodes/Words';
    import NodeView from './NodeView.svelte';
    import NodeSequenceView from './NodeSequenceView.svelte';

    export let node: Words;
</script>

<span class={node.getFormat()}
    ><NodeView node={node.open} /><NodeSequenceView
        nodes={node.getNodeSegments()}
    /><NodeView node={node.close} />
</span>

<style>
    .italic {
        font-style: italic;
    }
    .underline {
        text-decoration: underline;
    }
    .light {
        font-weight: 300;
    }
    .bold {
        font-weight: bold;
    }
    .extra {
        font-weight: 900;
    }
</style>
