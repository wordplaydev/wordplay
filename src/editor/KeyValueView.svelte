<script lang="ts">
    import type KeyValue from "../nodes/KeyValue";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: KeyValue;

</script>

<NodeView node={node}><OptionalNodeView node={node.key}/><TokenView node={node.bind}/><OptionalNodeView node={node.value}/></NodeView>