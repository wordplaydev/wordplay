<script lang="ts">
    import type MapType from "../nodes/MapType";
    import NodeView from "./NodeView.svelte";

    export let node: MapType;

</script>

<NodeView node={node.open}/><NodeView node={node.key}/><NodeView node={node.bind}/><NodeView node={node.value}/><NodeView node={node.close}/>