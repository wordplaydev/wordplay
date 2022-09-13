<script lang="ts">
    import type Share from "../nodes/Share";
    import NodeView from "./NodeView.svelte";
    
    export let node: Share;

</script>

<NodeView node={node.share} /><NodeView node={node.bind}/>