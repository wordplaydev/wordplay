<script lang="ts">
    import type Phrase from '@output/Phrase';
    import type Place from '@output/Place';
    import {
        getColorCSS,
        getFaceCSS as getFaceCSS,
        getSizeCSS as getSizeCSS,
        getOpacityCSS,
        toOutputTransform,
    } from '@output/outputToCSS';
    import type RenderContext from '@output/RenderContext';
    import Evaluate from '@nodes/Evaluate';
    import TextLiteral from '@nodes/TextLiteral';
    import { getContext, onMount, tick } from 'svelte';
    import type { Writable } from 'svelte/store';
    import moveOutput from '../palette/editOutput';
    import {
        getProject,
        getSelectedOutput,
        getSelectedPhrase,
    } from '../project/Contexts';
    import { database, locale, locales } from '../../db/Database';
    import TextLang from '../../output/TextLang';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Markup from '../../nodes/Markup';

    export let phrase: Phrase;
    export let place: Place;
    export let focus: Place;
    export let interactive: boolean;
    export let parentAscent: number;
    export let context: RenderContext;
    export let editing: boolean;

    const selectedOutput = getSelectedOutput();
    const selectedPhrase = getSelectedPhrase();
    const project = getProject();

    // Compute a local context based on size and font.
    $: context = phrase.getRenderContext(context);

    // Visible if z is ahead of focus and font size is greater than 0.
    $: visible = place.z > focus.z && (phrase.size ?? context.size > 0);

    // Get the phrase's text in the preferred language
    $: text = phrase.getLocalizedTextOrDoc($locales);
    $: empty = phrase.isEmpty();
    $: selectable = phrase.selectable && !empty;

    // The text field, if being edited.
    let view: HTMLDivElement | undefined;
    let input: HTMLInputElement | undefined;

    // Selected if this phrase's value creator is selected
    $: selected =
        phrase.value.creator instanceof Evaluate &&
        $selectedOutput?.includes(phrase.value.creator);

    let editable = getContext<Writable<boolean>>('editable');
    $: entered =
        selected &&
        $editable &&
        $selectedPhrase &&
        $selectedPhrase.index !== null;

    $: metrics = phrase.getMetrics(context);

    onMount(restore);

    function restore() {
        if ($editable) {
            if (entered) {
                if (
                    input &&
                    $selectedPhrase &&
                    $selectedPhrase.index !== null
                ) {
                    input.setSelectionRange(
                        $selectedPhrase.index,
                        $selectedPhrase.index
                    );
                    input.focus();
                }
            } else {
                if (selected && view) view.focus();
            }
        }
    }

    async function enter(event: MouseEvent) {
        select(input?.selectionStart ?? 0);
        event.stopPropagation();
        // Wait for the render and then focus the input.
        await tick();
        input?.focus();
    }

    function select(index: number | null) {
        if (selectedPhrase === undefined) return;
        selectedPhrase.set({
            name: phrase.getName(),
            index,
        });
    }

    function move(event: KeyboardEvent) {
        if ($project === undefined || selectedOutput === undefined) return;
        const increment = 0.5;
        let horizontal =
            event.key === 'ArrowLeft'
                ? -1 * increment
                : event.key === 'ArrowRight'
                ? increment
                : 0;
        let vertical =
            event.key === 'ArrowUp'
                ? 1 * increment
                : event.key === 'ArrowDown'
                ? -1 * increment
                : 0;

        if (phrase.value.creator instanceof Evaluate) {
            select(null);

            moveOutput(
                database,
                $project,
                [phrase.value.creator],
                $locales,
                horizontal,
                vertical,
                true
            );
        }
    }

    async function handleInput(event: { currentTarget: HTMLInputElement }) {
        if ($project === undefined || selectedOutput === undefined) return;
        if (event.currentTarget === null) return;
        const newText = event.currentTarget.value;
        const originalTextValue = phrase.getText();
        if (originalTextValue === undefined) return;

        // Reset the cache for proper layout.
        phrase._metrics = undefined;

        if (event.currentTarget.selectionStart !== null)
            select(event.currentTarget.selectionStart);

        database.reviseProjectNodes($project, [
            [
                phrase.value.creator,
                phrase.value.creator.replace(
                    originalTextValue.creator,
                    TextLiteral.make(newText)
                ),
            ],
        ]);
    }
</script>

{#if visible}
    <div
        role={selectable ? 'button' : 'presentation'}
        aria-hidden={empty ? 'true' : null}
        aria-disabled={!selectable}
        aria-label={phrase.getDescription($locales)}
        aria-roledescription={!selectable ? $locale.term.phrase : null}
        class="output phrase"
        class:selected
        tabIndex={interactive && ((!empty && selectable) || editing) ? 0 : null}
        data-id={phrase.getHTMLID()}
        data-node-id={phrase.value.creator.id}
        data-name={phrase.getName()}
        data-selectable={selectable}
        on:dblclick={$editable && interactive ? enter : null}
        on:keydown={$editable && interactive ? move : null}
        bind:this={view}
        style:font-family={getFaceCSS(context.face)}
        style:font-size={getSizeCSS(context.size)}
        style:background={phrase.background?.toCSS() ?? null}
        style:color={getColorCSS(phrase.getFirstRestPose(), phrase.pose)}
        style:opacity={getOpacityCSS(phrase.getFirstRestPose(), phrase.pose)}
        style:width="{metrics.width}px"
        style:height="{metrics.height}px"
        style:line-height="{metrics.height}px"
        style:transform={toOutputTransform(
            phrase.getFirstRestPose(),
            phrase.pose,
            place,
            focus,
            parentAscent,
            metrics
        )}
    >
        {#if entered}
            <input
                type="text"
                bind:value={text}
                bind:this={input}
                on:input={handleInput}
                on:keydown|stopPropagation
                on:pointerdown|stopPropagation
                style:width="{Math.max(
                    10,
                    phrase.getMetrics(context, false).width
                )}px"
            />
        {:else if text instanceof TextLang}{text.text}{:else if text instanceof Markup}<MarkupHtmlView
                markup={text.asLine()}
                inline
            />{/if}
    </div>
{/if}

<style>
    .phrase {
        /* The position of a phrase is absolute relative to its group. */
        position: absolute;
        left: 0;
        top: 0;
        white-space: nowrap;

        /* This disables translation around the center; we want to translate around the focus.*/
        transform-origin: 0 0;
    }

    :global(.editing) .phrase {
        min-width: 8px;
        min-height: 8px;
    }

    .phrase[data-selectable='true'] {
        cursor: pointer;
    }

    .phrase > :global(.light) {
        font-weight: 300;
    }

    .phrase > :global(.extra) {
        font-weight: 900;
    }

    :global(.stage.editing.interactive) .selected {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-highlight-color);
    }

    :global(.stage.editing.interactive) :not(.selected) {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-inactive-color);
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
        border-bottom: var(--wordplay-highlight-color) solid
            var(--wordplay-focus-width);
        outline: none;
        min-width: 1em;
        min-height: 1em;
    }

    input:focus {
        color: inherit;
    }
</style>
