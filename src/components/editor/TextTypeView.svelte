<svelte:options immutable={true} />

<script lang="ts">
    import type TextType from '@nodes/TextType';
    import NodeView from './NodeView.svelte';

    export let node: TextType;
</script>

<NodeView node={node.open} /><NodeView node={node.text} /><NodeView
    node={node.close}
/><NodeView node={node.language} />
