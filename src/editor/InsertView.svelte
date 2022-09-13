<script lang="ts">
    import type Insert from "../nodes/Insert";
    import NodeView from "./NodeView.svelte";

    export let node: Insert;

</script>

<NodeView node={node.table}/><NodeView node={node.insert}/><NodeView node={node.row}/>