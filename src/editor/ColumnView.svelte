<script lang="ts">
    import type Column from "../nodes/Column";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Column;

</script>

<TokenView node={node.bar}/><OptionalNodeView node={node.bind}/>