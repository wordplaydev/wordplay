<script lang="ts">
    import type TypeVariable from "../nodes/TypeVariable";
    import type Unparsable from "../nodes/Unparsable";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let typeVars: (TypeVariable|Unparsable)[];

</script>

{#each typeVars as typeVar}<OptionalNodeView node={typeVar}/>{/each}