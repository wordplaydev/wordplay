<script lang="ts">
    import type BooleanType from "../nodes/BooleanType";
    import NodeView from "./NodeView.svelte";
    
    export let node: BooleanType;

</script>

<NodeView node={node.type} />