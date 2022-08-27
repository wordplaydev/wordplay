<script lang="ts">
    import type Docs from "../nodes/Docs";
    import renderNode from "./renderNode";

    export let docs: Docs[];

</script>


<div>
    {#each docs as doc }<svelte:component this={renderNode(doc)} node={doc} />{/each}
</div>