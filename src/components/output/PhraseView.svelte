<svelte:options immutable={true} />

<script lang="ts">
    import type Phrase from '@output/Phrase';
    import type Place from '@output/Place';
    import parseRichText from '@output/parseRichText';
    import outputToCSS from '@output/outputToCSS';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import type RenderContext from '@output/RenderContext';
    import Pose from '@output/Pose';
    import Evaluate from '@nodes/Evaluate';
    import TextLiteral from '@nodes/TextLiteral';
    import { getContext, onMount } from 'svelte';
    import type { Writable } from 'svelte/store';
    import moveOutput from '../palette/moveOutput';
    import {
        getProject,
        getProjects,
        getSelectedOutput,
        getSelectedPhrase,
    } from '../project/Contexts';

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
    const projects = getProjects();

    // Compute a local context based on size and font.
    $: context = phrase.getRenderContext(context);

    // Visible if z is ahead of focus.
    $: visible = place.z > focus.z;

    // Get the phrase's text in the preferred language
    $: text = phrase.getDescription($preferredLanguages);
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

    onMount(restore);

    function restore() {
        if ($editable) {
            if (entered) {
                if (input && $selectedPhrase && $selectedPhrase.index) {
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

    function enter(event: MouseEvent) {
        select(input?.selectionStart ?? 0);
        event.stopPropagation();
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
                $projects,
                $project,
                [phrase.value.creator],
                $preferredLanguages,
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
        const originalTextValue = phrase.value.resolve('text');
        if (originalTextValue === undefined) return;

        // Reset the cache for proper layout.
        phrase._metrics = undefined;

        if (event.currentTarget.selectionStart !== null)
            select(event.currentTarget.selectionStart);

        $projects.reviseNodes($project, [
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
        role="button"
        aria-hidden={empty ? 'true' : null}
        aria-disabled={!selectable}
        aria-roledescription={$preferredTranslations[0].terminology.phrase}
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
        style={outputToCSS(
            context.font,
            context.size,
            phrase.rotation,
            // No first pose because of an empty sequence? Give a default.
            phrase.rest instanceof Pose
                ? phrase.rest
                : phrase.rest.getFirstPose() ?? new Pose(phrase.value),
            place,
            undefined,
            undefined,
            focus,
            parentAscent,
            phrase.getMetrics(context)
        )}
    >
        {#if entered}
            <!-- svelte-ignore a11y-autofocus -->
            <input
                type="text"
                bind:value={text}
                bind:this={input}
                on:input={handleInput}
                on:keydown|stopPropagation
                on:mousedown|stopPropagation
                style:width="{phrase.getMetrics(context, false).width}px"
                autofocus
            />
        {:else}
            {@html parseRichText(text).toHTML()}
        {/if}
    </div>
{/if}

<style>
    .phrase {
        /* The position of a phrase is absolute relative to its group. */
        position: absolute;
        left: 0;
        top: 0;
        white-space: nowrap;
        width: auto;
        right: auto;
    }

    .phrase[data-selectable='true'] {
        cursor: pointer;
    }

    .phrase > :global(.light) {
        font-weight: 300;
    }

    .phrase > :global(.extra) {
        font-weight: 700;
    }

    :global(.verse.editing.interactive) .selected {
        outline: var(--wordplay-border-width) dotted var(--wordplay-highlight);
    }

    :not(.selected):focus {
        outline: none;
        color: var(--wordplay-highlight);
    }

    :global(.verse.editing.interactive) :not(.selected) {
        outline: var(--wordplay-border-width) dotted
            var(--wordplay-disabled-color);
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
