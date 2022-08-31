<script lang="ts">
    import type NameType from "../nodes/NameType";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: NameType;

</script>

<NodeView node={node}><TokenView node={node.type} /></NodeView>