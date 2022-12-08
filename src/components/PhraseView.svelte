<svelte:options immutable={true}/>

<script lang="ts">
    import type Phrase from "../output/Phrase";
    import { sizeToPx } from "../output/Phrase";
    import type Place from "../output/Place";

    export let phrase: Phrase;
    export let place: Place;

</script>

<div 
    class="phrase"
    style={`
        left: ${sizeToPx(place.x)}; 
        top: ${sizeToPx(place.y)}; 
        ${phrase.font ? `font-family: "${phrase.font}";` : ""}
        ${phrase.color ? `color: ${phrase.color.toCSS()};`: ""}
        font-size: ${sizeToPx(phrase.size)};
    `}
>
    {phrase.text[0].text}
</div>

<style>
    .phrase {
        /* THe position of a phrase is absolute relative to its group. */
        position: absolute;
        white-space: nowrap;
        width: auto;
        right: auto;
    }
</style>