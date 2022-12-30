<svelte:options immutable={true} />

<script lang="ts">
    import { languages } from '../models/languages';
    import { selectTranslation } from '../nodes/Translations';
    import type Phrase from '../output/Phrase';
    import type Place from '../output/Place';
    import parseRichText from '../output/parseRichText';
    import phraseToCSS from '../output/phraseToCSS';

    export let phrase: Phrase;
    export let place: Place;
    export let focus: Place;
</script>

<div
    class="phrase"
    id={`phrase-${phrase.getName()}`}
    style={phraseToCSS(phrase, phrase.place ?? place, focus)}
>
    {@html parseRichText(
        selectTranslation(phrase.getDescriptions(), $languages)
    ).toHTML()}
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
