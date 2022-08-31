<script lang="ts">
    import type Share from "../nodes/Share";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Share;

</script>

<div class="node-view">
    <TokenView node={node.share} /><NodeView node={node.bind}/>
</div>