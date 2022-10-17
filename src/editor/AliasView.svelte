<script lang="ts">
    import type Alias from "../nodes/Alias";
    import NodeView from "./NodeView.svelte";
    
    export let node: Alias;

</script>

<NodeView node={node.separator}/><strong><NodeView node={node.name}/></strong><NodeView node={node.lang}/>