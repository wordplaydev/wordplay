<script lang="ts">
    import type AccessName from "../nodes/AccessName";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: AccessName;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.subject}/><TokenView node={node.access}/><TokenView node={node.name}/>
</NodeView>