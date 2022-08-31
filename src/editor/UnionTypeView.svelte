<script lang="ts">
    import type UnionType from "../nodes/UnionType";
import NodeView from "./NodeView.svelte";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: UnionType;

</script>

<div class="node-view">
    <NodeView node={node.left}/><TokenView node={node.or}/><NodeView node={node.right}/>
</div>