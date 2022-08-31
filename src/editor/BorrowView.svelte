<script lang="ts">
    import type Borrow from "../nodes/Borrow";
    import NodeView from "./NodeView.svelte";
    import OptionalToken from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Borrow;

</script>

<NodeView node={node} block>
    <TokenView node={node.borrow} /><TokenView node={node.name} /><OptionalToken node={node.version} />
</NodeView>