<script lang="ts">
    import type Share from "../nodes/Share";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";
    
    export let node: Share;

</script>

<div class="node-view">
    <TokenView node={node.share} />
    <svelte:component this={renderNode(node.bind)} node={node.bind} />
</div>