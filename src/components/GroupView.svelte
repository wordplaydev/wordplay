<svelte:options immutable={true}/>

<script lang="ts">
    import type Group from "../output/Group";
    import { Phrase } from "../output/Phrase";
    import PhraseView from "./PhraseView.svelte";

    export let group: Group;

</script>

<div>
    {#each group.getGroups() as g }
        {#if g instanceof Phrase }
            <PhraseView phrase={g} />
        {:else}
            <svelte:self group={g} />
        {/if}
    {/each}
</div>