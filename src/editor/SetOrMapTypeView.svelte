<script lang="ts">
    import type SetOrMapType from "../nodes/SetOrMapType";
import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapType;

</script>

<NodeView node={node}><TokenView node={node.open}/><OptionalNodeView node={node.key}/><OptionalTokenView node={node.bind}/><OptionalNodeView node={node.value}/><TokenView node={node.close}/></NodeView>