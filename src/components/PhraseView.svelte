<svelte:options immutable={true} />

<script lang="ts">
    import type Phrase from '../output/Phrase';
    import type Place from '../output/Place';
    import parseRichText from '../output/parseRichText';
    import phraseToCSS from '../output/phraseToCSS';
    import { preferredLanguages } from '../translation/translations';
    import { getContext } from 'svelte';
    import type { Writable } from 'svelte/store';
    import { selectedOutput } from '../models/stores';

    export let phrase: Phrase;
    export let place: Place;
    export let focus: Place;

    $: editable = getContext<Writable<boolean>>('editable');

    function select(event: MouseEvent | KeyboardEvent) {
        if ($editable && selectedOutput) {
            const node = phrase.value.creator;
            const nodes = $selectedOutput;
            const index = nodes.indexOf(node);
            selectedOutput?.set(
                event.shiftKey
                    ? index >= 0
                        ? [...nodes.slice(0, index), ...nodes.slice(index + 1)]
                        : [...nodes, node]
                    : index >= 0
                    ? []
                    : [node]
            );
        }
    }

    $: selected = $selectedOutput.includes(phrase.value.creator);
</script>

<div
    class="phrase"
    class:selected={$editable && selected}
    tabIndex="0"
    id={`phrase-${phrase.getName()}`}
    style={phraseToCSS(phrase, phrase.place ?? place, focus)}
    on:mousedown={(event) => ($selectedOutput ? select(event) : null)}
    on:keydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? select(event) : undefined}
>
    {@html parseRichText(phrase.getDescription($preferredLanguages)).toHTML()}
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

    .phrase.selected {
        color: transparent;
        text-shadow: 0 0 0 var(--wordplay-highlight);
    }

    .phrase:focus {
        outline: none;
        border-bottom: var(--wordplay-highlight) solid
            var(--wordplay-focus-width);
    }
</style>
