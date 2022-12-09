<svelte:options immutable={true}/>

<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import { selectTranslation } from "../nodes/Translations";
    import type Phrase from "../output/Phrase";
    import { sizeToPx } from "../output/Phrase";
    import type Place from "../output/Place";
    import parseRichText from "../output/parseRichText";
    import toCSS from "../output/toCSS";
    import Decimal from "decimal.js";
    
    export let phrase: Phrase;
    export let place: Place;
    export let focus: Place;

    const MAGNIFIER = new Decimal(12);

    let languages = getLanguages();        

</script>

<div 
    class="phrase"
    style={toCSS({
        left: sizeToPx(phrase.place ? phrase.place.x : place.x),
        top: sizeToPx(phrase.place ? phrase.place.y : place.y),
        "font-family": phrase.font,
        color: phrase.color?.toCSS(),
        transform: 
            phrase.offset || phrase.rotation || phrase.scalex || phrase.scaley ? 
            `${phrase.offset ? `translate(${sizeToPx(phrase.offset.x)}, ${sizeToPx(phrase.offset.y)})`: ""} ${phrase.rotation ? `rotate(${phrase.rotation.toNumber()}deg)` : ""} ${phrase.scalex || phrase.scaley ? `scale(${phrase.scalex?.toNumber() ?? 1}, ${phrase.scaley?.toNumber() ?? 1})` : ""}` : 
            undefined,
        // The font size is whatever it's normal size is, but adjusted for perspective, then translated into pixels.
        "font-size": sizeToPx(MAGNIFIER.times(phrase.size.dividedBy(place.z.sub(focus.z).toNumber()))),
        opacity: phrase.opacity ? phrase.opacity.toString() : undefined
    })}
>
    {@html parseRichText(selectTranslation(phrase.getDescriptions(), $languages)).toHTML()}
</div>

<style>
    .phrase {
        /* The position of a phrase is absolute relative to its group. */
        position: absolute;
        white-space: nowrap;
        width: auto;
        right: auto;
    }
    .phrase > :global(.light) {
        font-weight: 300;
    }
    .phrase > :global(.extra) {
        font-weight: 700;
    }

</style>