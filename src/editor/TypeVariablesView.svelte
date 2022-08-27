<script lang="ts">
    import type TypeVariable from "../nodes/TypeVariable";
    import type Unparsable from "../nodes/Unparsable";
    import renderNode from "./renderNode";

    export let typeVars: (TypeVariable|Unparsable)[];

</script>

<div class="node-view">
    {#each typeVars as typeVar}<svelte:component this={renderNode(typeVar)} node={typeVar} />{/each}
</div>