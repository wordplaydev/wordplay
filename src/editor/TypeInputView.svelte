<script lang="ts">
    import type TypeInput from "../nodes/TypeInput";
    import NodeView from "./NodeView.svelte";

    export let node: TypeInput;

</script>

<NodeView node={node.dot}/><NodeView node={node.type}/>