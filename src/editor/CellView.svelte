<script lang="ts">
    import type Cell from "../nodes/Cell";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Cell;

</script>

<TokenView node={node.bar}/><OptionalNodeView node={node.expression}/>