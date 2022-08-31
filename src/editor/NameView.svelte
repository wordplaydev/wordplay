<script lang="ts">
    import type Name from "../nodes/Name";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Name;

</script>

<NodeView node={node}><TokenView node={node.name} /></NodeView>