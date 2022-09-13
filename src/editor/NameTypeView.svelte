<script lang="ts">
    import type NameType from "../nodes/NameType";
    import NodeView from "./NodeView.svelte";
    
    export let node: NameType;

</script>

<NodeView node={node.type} />