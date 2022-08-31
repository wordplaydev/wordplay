<script lang="ts">
    import type SetOrMapAccess from "../nodes/SetOrMapAccess";
import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapAccess;

</script>

<NodeView node={node}><OptionalNodeView node={node.setOrMap}/><TokenView node={node.open}/><OptionalNodeView node={node.key}/><TokenView node={node.close}/></NodeView>