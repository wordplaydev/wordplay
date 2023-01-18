<script lang="ts">
    import { toVerse, VerseType } from '../output/Verse';
    import Exception from '../runtime/Exception';
    import type Value from '../runtime/Value';
    import { playing, reviseProject, selectedOutput } from '../models/stores';
    import KeyboardIdle from '../editor/util/KeyboardIdle';
    import type Project from '../models/Project';
    import ValueView from './ValueView.svelte';
    import type Source from '../nodes/Source';
    import VerseView from './VerseView.svelte';
    import { createEventDispatcher } from 'svelte';
    import { slide } from 'svelte/transition';
    import DescriptionView from './DescriptionView.svelte';
    import {
        preferredLanguages,
        preferredTranslations,
        writingDirection,
        writingLayout,
    } from '../translation/translations';
    import OutputEditor from './OutputEditor.svelte';
    import Evaluate from '../nodes/Evaluate';
    import TextLiteral from '../nodes/TextLiteral';
    import Reference from '../nodes/Reference';
    import { PhraseType } from '../output/Phrase';
    import StructureDefinition from '../nodes/StructureDefinition';
    import { GroupType } from '../output/Group';
    import type Node from '../nodes/Node';
    import { StackType } from '../output/Stack';

    export let project: Project;
    export let source: Source;
    export let latest: Value | undefined;
    export let mode: 'mini' | 'peripheral' | 'fullscreen';

    let active = false;

    const dispatch = createEventDispatcher<{ fullscreen: { on: boolean } }>();

    $: verse = latest === undefined ? undefined : toVerse(latest);

    $: output =
        $selectedOutput.filter(
            (node): node is Evaluate =>
                node instanceof Evaluate &&
                (node.is(PhraseType, project.getNodeContext(node)) ||
                    node.is(VerseType, project.getNodeContext(node)))
        ) ?? [];

    function activate() {
        if (mode === 'peripheral') active = true;
    }
    function deactivate() {
        if (mode === 'peripheral') active = false;
    }

    function maximize() {
        dispatch('fullscreen', { on: !(mode === 'fullscreen') });
    }

    let dragging = false;
    let position: { x: number; y: number } = { x: 0, y: 0 };
    function drag(event: MouseEvent) {
        if (dragging && event.currentTarget instanceof HTMLElement) {
            position = {
                x: event.pageX - event.currentTarget.offsetLeft,
                y: event.pageY - event.currentTarget.offsetTop,
            };
        }
    }
    function drop() {
        dragging = false;
    }

    function addOutput() {
        if (project === undefined) return;

        // Make an empty phrase.
        const newPhrase = Evaluate.make(
            Reference.make(
                PhraseType.names.getTranslation($preferredLanguages),
                PhraseType
            ),
            [TextLiteral.make($preferredTranslations[0].welcome)]
        );

        // Get the output of the source's program block.
        const lastExpression = source.expression.expression.statements.at(-1);

        let revision: [Node, Node] | undefined = undefined;

        // There's a last expression
        if (lastExpression) {
            const context = project.getNodeContext(lastExpression);
            const type =
                lastExpression instanceof Evaluate
                    ? lastExpression.getFunction(context)
                    : undefined;

            // If it's a verse, add the new phrase to the verse's group
            if (type === VerseType) {
                const firstVerseInput =
                    lastExpression instanceof Evaluate
                        ? lastExpression.inputs[0]
                        : undefined;
                const firstVerseEvaluate =
                    firstVerseInput instanceof Evaluate
                        ? firstVerseInput
                        : undefined;
                const firstVerseType =
                    firstVerseInput instanceof Evaluate
                        ? firstVerseInput.getFunction(context)
                        : undefined;
                // If the verse group input is a group, append the phrase to the group.
                if (
                    firstVerseEvaluate &&
                    firstVerseType instanceof StructureDefinition &&
                    type.implements(GroupType, context)
                ) {
                    revision = [
                        firstVerseEvaluate,
                        firstVerseEvaluate.withInputAppended(newPhrase),
                    ];
                }
            }
            // If it's a phrase, create a verse to hold the existing phrase and the new phrase
            else if (type === PhraseType) {
                revision = [
                    lastExpression,
                    Evaluate.make(
                        Reference.make(
                            VerseType.names.getTranslation($preferredLanguages),
                            VerseType
                        ),
                        [
                            Evaluate.make(
                                Reference.make(
                                    StackType.names.getTranslation(
                                        $preferredLanguages
                                    ),
                                    StackType
                                ),
                                [lastExpression, newPhrase]
                            ),
                        ]
                    ),
                ];
            }
            // If it's a group...
            else if (
                type instanceof StructureDefinition &&
                type.implements(GroupType, context)
            ) {
            }
            // Otherwise, append the phrase.
            else {
                revision = [
                    source.expression.expression,
                    source.expression.expression.withStatement(newPhrase),
                ];
            }
        }
        // Nothing yet, just add the phrase to the program.
        else {
            revision = [
                source.expression.expression,
                source.expression.expression.withStatement(newPhrase),
            ];
        }

        if (revision) {
            reviseProject([revision]);
            selectedOutput.set([newPhrase]);
        }
    }
</script>

<svelte:window on:blur={() => (dragging = false)} />

<section
    class={`output ${mode}`}
    class:active
    class:mode
    style:direction={$writingDirection}
    style:writing-mode={$writingLayout}
    on:focusin={activate}
    on:focusout={deactivate}
    transition:slide
    on:mousemove={drag}
    on:mouseup={drop}
>
    <!-- Render the phrase editor if there are selected phrases. -->
    {#if mode === 'peripheral' && output.length > 0}
        <OutputEditor bind:dragging nodes={output} {position} />
    {/if}
    <!-- Render the verse, or whatever value we get -->
    <div
        class="verse"
        style={verse !== undefined
            ? `background-color: ${verse.background.toCSS()};`
            : undefined}
    >
        <!-- If there's an exception, show that. -->
        {#if latest instanceof Exception}
            <div class="fill exception"
                ><div class="message"
                    >{#each $preferredTranslations as translation}
                        <DescriptionView
                            description={latest.getDescription(translation)}
                        />
                    {/each}
                </div></div
            >
            <!-- If there's no verse -->
        {:else if latest === undefined}
            <!-- If it's because the keyboard isn't idle, show the typing feedback.-->
            {#if $playing && !$KeyboardIdle}
                <div class="fill editing"><div class="message">⌨️</div></div>
            {:else}
                <div class="fill evaluating"><div class="message">...</div></div
                >
            {/if}
            <!-- If there's a value, but it's not a verse, show that -->
        {:else if verse === undefined}
            <div class="fill value">
                <div class="message">
                    <h2
                        >{$preferredTranslations.map((translation) =>
                            latest === undefined
                                ? undefined
                                : latest
                                      .getType(project.getContext(source))
                                      .getDescription(
                                          translation,
                                          project.getContext(source)
                                      )
                        )}</h2
                    >
                    <p><ValueView value={latest} /></p>
                </div>
            </div>
            <!-- Otherwise, show the Verse -->
        {:else}
            <VerseView
                {project}
                {verse}
                interactive={mode !== 'mini' && source === project.main}
                editable={mode === 'peripheral' && $playing}
            />
        {/if}
    </div>
    {#if mode !== 'mini'}
        <div class="toolbar">
            <div
                class="add"
                tabIndex="0"
                on:click={addOutput}
                on:keydown={(event) =>
                    event.key === 'Enter' || event.key === ' '
                        ? addOutput()
                        : undefined}>+</div
            >
        </div>
        <!-- A few buttons for minimize and maximize -->
        <div
            class="maximize"
            on:click={maximize}
            tabIndex="0"
            on:keydown={(event) =>
                event.key === 'Enter' || event.key === ' '
                    ? maximize()
                    : undefined}
        >
            <svg width="100%" height="100%" version="1.1" viewBox="0 0 36 36">
                <path d="m 10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z" />
                <path d="m 20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z" />
                <path d="m 24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z" />
                <path d="M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z" />
            </svg>
        </div>
    {/if}
</section>

<style>
    .output {
        transition: ease-in, width 0.25s ease-in, height 0.25s ease-in;
        transform-origin: top right;

        background-color: var(--wordplay-background);

        overflow: hidden;
        z-index: var(--wordplay-layer-output);

        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: relative;
    }

    .fullscreen {
        position: fixed;
        width: 100vw;
        height: 100vh;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: var(--wordplay-layer-fullscreen);
    }

    .fullscreen .verse {
        width: 100%;
        height: 100%;
    }

    .verse {
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        flex: 1;
        width: 100%;
        min-height: 2em;
    }

    .mini {
        position: static;
        width: 3em;
        height: 3em;
        box-shadow: none;
        background-color: var(--wordplay-background);
        transform-origin: center;
        z-index: 1;
    }

    .fill {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .fill .message {
        width: 100%;
        height: auto;
        padding: var(--wordplay-spacing);
        text-align: center;
        line-height: 100%;
        font-size: 48pt;
        transform-origin: center;
    }

    .editing .message {
        animation: jiggle 0.2s ease-out infinite;
    }

    @keyframes jiggle {
        0% {
            transform: rotate(-4deg) translate(0, 0);
        }
        25% {
            transform: rotate(6deg) translate(0, -1px);
        }
        50% {
            transform: rotate(-8deg) translate(0, 2px);
        }
        75% {
            transform: rotate(-2deg) translate(0, -4px);
        }
        100% {
            transform: rotate(4deg) translate(0, 1px);
        }
    }

    .exception {
        color: var(--wordplay-background);
        background-color: var(--wordplay-error);
    }

    .exception .message {
        animation: shake 0.1s 3;
    }

    .verse:focus-within {
        outline: var(--wordplay-highlight) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
        z-index: 2;
    }

    .maximize {
        position: absolute;
        top: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        width: 2em;
        height: 2em;
        z-index: var(--wordplay-layer-fullscreen);
        fill: var(--wordplay-disabled-color);
    }

    .toolbar {
        position: absolute;
        top: var(--wordplay-spacing);
        left: var(--wordplay-spacing);
        width: 1em;
        height: 1em;
        text-align: center;
        z-index: var(--wordplay-layer-fullscreen);
        color: var(--wordplay-disabled-color);
        cursor: pointer;
    }

    .maximize:hover {
        fill: var(--wordplay-background);
        cursor: pointer;
        transform: scale(1.2);
    }
</style>
