<svelte:options immutable={true}/>

<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Group from "../output/Group";
    import Phrase, { sizeToPx } from "../output/Phrase";
    import type Place from "../output/Place";
    import type Verse from "../output/Verse";
    import PhraseView from "./PhraseView.svelte";

    export let verse: Verse;
    export let group: Group;
    export let place: Place;

    let languages = getLanguages();
    $: context = { font: verse.font, languages: $languages};

</script>

<div class="group" style={`left: ${sizeToPx(place.x)}; top: ${sizeToPx(place.y)}; width: ${sizeToPx(group.getWidth(context))}; height: ${sizeToPx(group.getHeight(context))};`}>
    {#each group.getPlaces(context) as [ subgroup, place ] }
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