<script lang="ts">
    import type ColumnType from "../nodes/ColumnType";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: ColumnType;

</script>

<TokenView node={node.bar}/><OptionalNodeView node={node.bind}/>