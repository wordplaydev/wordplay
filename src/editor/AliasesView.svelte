<script lang="ts">
    import type Alias from "../nodes/Alias";
    import AliasView from "./AliasView.svelte";

    export let aliases: Alias[];

</script>

<span>
    {#each aliases as alias}<AliasView node={alias}/>{/each}
</span>