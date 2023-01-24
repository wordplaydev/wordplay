<svelte:options immutable={true} />

<script lang="ts">
    import type Phrase from '../output/Phrase';
    import type Place from '../output/Place';
    import parseRichText from '../output/parseRichText';
    import phraseToCSS from '../output/phraseToCSS';
    import { preferredLanguages } from '../translation/translations';
    import { getContext, tick } from 'svelte';
    import type { Writable } from 'svelte/store';
    import { reviseProject, selectedOutput } from '../models/stores';
    import type { RenderContext } from '../output/Group';
    import TextLiteral from '../nodes/TextLiteral';

    export let phrase: Phrase;
    export let place: Place;
    export let focus: Place;
    export let context: RenderContext;

    $: editable = getContext<Writable<boolean>>('editable');

    function select(event: MouseEvent | KeyboardEvent) {
        if ($editable) {
            const node = phrase.value.creator;
            const nodes = $selectedOutput;
            const index = nodes.indexOf(node);
            selectedOutput.set(
                event.shiftKey
                    ? index >= 0
                        ? [...nodes.slice(0, index), ...nodes.slice(index + 1)]
                        : [...nodes, node]
                    : [node]
            );
        }
    }

    function handleKey(event: KeyboardEvent) {
        if (!$editable) return;
        if (event.key === 'Enter' || event.key === ' ') select(event);
        // Remove the node that created this phrase.
        else if (event.key === 'Backspace' && (event.metaKey || event.ctrlKey))
            reviseProject([[phrase.value.creator, undefined]]);
    }

    let text: string = phrase.getDescription($preferredLanguages);
    let input: HTMLInputElement;
    async function handleInput(event: any) {
        const newText = event.currentTarget.value;
        const originalTextValue = phrase.value.resolve('text');
        if (originalTextValue === undefined) return;

        const start = event.currentTarget.selectionStart;
        const end = event.currentTarget.selectionEnd;

        reviseProject([
            [
                phrase.value.creator,
                phrase.value.creator.replace(
                    originalTextValue.creator,
                    TextLiteral.make(newText)
                ),
            ],
        ]);

        // After the update, focus on the new input and restore the caret position.
        await tick();
        if (input) {
            input.focus({ preventScroll: true });
            input.setSelectionRange(start, end);
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
    on:keydown={handleKey}
>
    {#if selected}
        <!-- svelte-ignore a11y-autofocus -->
        <input
            type="text"
            bind:value={text}
            bind:this={input}
            on:input={handleInput}
            on:keydown|stopPropagation
            style:width="{phrase.getMetrics(context, false).width}px"
            autofocus
        />
    {:else}
        {@html parseRichText(
            phrase.getDescription($preferredLanguages)
        ).toHTML()}
    {/if}
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
        text-shadow: 0 0 0 var(--wordplay-highlight);
    }

    .phrase:focus {
        outline: none;
        border-bottom: var(--wordplay-highlight) solid
            var(--wordplay-focus-width);
    }

    input {
        font-family: inherit;
        font-weight: inherit;
        font-style: inherit;
        font-size: inherit;
        color: inherit;
        border: inherit;
        background: inherit;
        padding: 0;
        border-bottom: var(--wordplay-highlight) solid
            var(--wordplay-focus-width);
        outline: none;
        min-width: 1em;
    }
</style>
