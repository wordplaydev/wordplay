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
        left: ${sizeToPx(phrase.place ? phrase.place.x : place.x)}; 
        top: ${sizeToPx(phrase.place ? phrase.place.y : place.y)};
        ${phrase.font ? `font-family: "${phrase.font}";` : ""}
        ${phrase.color ? `color: ${phrase.color.toCSS()};`: ""}
        ${phrase.offset || phrase.rotation || phrase.scalex || phrase.scaley ? 
            `transform: 
                ${phrase.offset ? `translate(${sizeToPx(phrase.offset.x)}, ${sizeToPx(phrase.offset.y)})`: ""} 
                ${phrase.rotation ? `rotate(${phrase.rotation.toNumber()}deg)` : ""} 
                ${phrase.scalex || phrase.scaley ? `scale(${phrase.scalex?.toNumber() ?? 1}, ${phrase.scaley?.toNumber() ?? 1})` : ""}
            ;` : ""}
        font-size: ${sizeToPx(phrase.size)};
        ${phrase.opacity ? `opacity: ${phrase.opacity.toNumber()};` : ""}
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