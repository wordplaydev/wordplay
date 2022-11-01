<script lang="ts">
    import type NoneLiteral from "../nodes/NoneLiteral";
    import NodeView from "./NodeView.svelte";

    export let node: NoneLiteral;

</script>

<NodeView node={node.none}/>