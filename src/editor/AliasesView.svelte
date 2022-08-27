<script lang="ts">
    import type Alias from "../nodes/Alias";
    import AliasView from "./AliasView.svelte";

    export let aliases: Alias[];

</script>

<div class="node-view">
    {#each aliases as alias}<AliasView node={alias}/>{/each}
</div>