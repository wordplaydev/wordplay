<script lang="ts">
    import type Docs from "../nodes/Documentation";
    import NodeView from "./NodeView.svelte";
    
    export let node: Docs;

</script>

<NodeView node={node.docs}/><NodeView node={node.lang}/>