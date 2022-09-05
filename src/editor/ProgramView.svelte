<script lang="ts">
    import type Program from "../nodes/Program";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import { caret } from "../models/stores";
    import TokenView from "./TokenView.svelte";

    export let program: Program;

</script>

<NodeView node={program} block>
    {#each program.borrows as borrow}<OptionalNodeView node={borrow}/>{/each}<OptionalNodeView node={program.block}/><TokenView node={program.end}/>
</NodeView>