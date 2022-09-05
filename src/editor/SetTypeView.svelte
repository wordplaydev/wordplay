<script lang="ts">
    import type SetType from "../nodes/SetType";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: SetType;

</script>

<NodeView node={node}><TokenView node={node.open}/><OptionalNodeView node={node.key}/><TokenView node={node.close}/></NodeView>