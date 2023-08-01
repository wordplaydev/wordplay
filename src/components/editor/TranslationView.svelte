<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Translation from '../../nodes/Translation';

    export let node: Translation;
</script>

<NodeView node={node.text} /><NodeView node={node.language} />
