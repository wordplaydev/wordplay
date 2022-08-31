<script lang="ts">
    import type Is from "../nodes/Is";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Is;

</script>

<div class="node-view">
    <NodeView node={node.left}/><TokenView node={node.operator}/><NodeView node={node.right}/>
</div>