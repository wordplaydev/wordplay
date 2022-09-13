<script lang="ts">
    import type Name from "../nodes/Name";
    import NodeView from "./NodeView.svelte";
    
    export let node: Name;

</script>

<NodeView node={node.name} />