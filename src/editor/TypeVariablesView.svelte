<script lang="ts">
    import type TypeVariable from "../nodes/TypeVariable";
    import type Unparsable from "../nodes/Unparsable";
    import NodeView from "./NodeView.svelte";

    export let typeVars: (TypeVariable|Unparsable)[];

</script>

<div class="node-view">
    {#each typeVars as typeVar}<NodeView node={typeVar}/>{/each}
</div>