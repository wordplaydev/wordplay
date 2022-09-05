<script lang="ts">
    import type MapLiteral from "../nodes/MapLiteral";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: MapLiteral;

</script>

<NodeView node={node}><TokenView node={node.open}/><OptionalTokenView node={node.bind}/>{#each node.values as value}<OptionalNodeView node={value}/>{/each}<OptionalNodeView node={node.close}/></NodeView>