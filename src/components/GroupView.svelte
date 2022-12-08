<svelte:options immutable={true}/>

<script lang="ts">
    import type Group from "../output/Group";
    import Phrase, { sizeToPx } from "../output/Phrase";
    import type Place from "../output/Place";
    import type Verse from "../output/Verse";
    import PhraseView from "./PhraseView.svelte";

    export let verse: Verse;
    export let group: Group;
    export let place: Place;

</script>

<div class="group debug" style={`left: ${sizeToPx(place.x)}; top: ${sizeToPx(place.y)}; width: ${sizeToPx(group.getWidth(verse.font))}; height: ${sizeToPx(group.getHeight(verse.font))};`}>
    {#each group.getPlaces(verse.font) as [ subgroup, place ] }
        {#if subgroup instanceof Phrase }
            <PhraseView phrase={subgroup} {place}/>
        {:else}        
            <svelte:self {verse} group={subgroup} {place}/>
        {/if}
    {/each}
</div>

<style>
    .group {
        position: absolute;
    }
</style>