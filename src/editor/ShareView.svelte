<script lang="ts">
    import type Share from "../nodes/Share";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Share;

</script>

<NodeView node={node} block><TokenView node={node.share} /><OptionalNodeView node={node.bind}/></NodeView>