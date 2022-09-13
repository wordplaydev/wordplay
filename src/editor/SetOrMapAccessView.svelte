<script lang="ts">
    import type SetOrMapAccess from "../nodes/SetOrMapAccess";
    import NodeView from "./NodeView.svelte";

    export let node: SetOrMapAccess;

</script>

<NodeView node={node.setOrMap}/><NodeView node={node.open}/><NodeView node={node.key}/><NodeView node={node.close}/>