<script lang="ts">
    import Evaluate from '@nodes/Evaluate';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import { PhraseType } from '@output/Phrase';
    import BindSlider from './BindSlider.svelte';
    import { reviseProject, selectedOutput } from '../../models/stores';
    import Button from '../widgets/Button.svelte';
    import BindOptions from './BindOptions.svelte';
    import { VerseType } from '@output/Verse';
    import type Project from '../../models/Project';
    import BindColor from './BindColor.svelte';
    import type Node from '@nodes/Node';
    import StructureDefinition from '@nodes/StructureDefinition';
    import { GroupType } from '@output/Group';
    import Reference from '@nodes/Reference';
    import { StackType } from '@output/Stack';
    import TextLiteral from '@nodes/TextLiteral';
    import OutputPropertyRange from '@transforms/OutputPropertyRange';
    import OutputValueSet from '@transforms/OutputPropertyValueSet';
    import BindText from './BindText.svelte';
    import OutputExpression, {
        OutputPropertyText,
        type OutputProperty,
    } from '@transforms/OutputExpression';
    import OutputPropertyOptions from '../../transforms/OutputPropertyOptions';

    export let project: Project;

    /** Transform the selected Evaluate nodes into Output wrappers, filtering out anything that's not valid output. */
    $: outputs = $selectedOutput
        .map((evaluate) => new OutputExpression(project, evaluate))
        .filter((out) => out.isOutput());

    /**
     * From the list of OutputExpressions, generate a value set for each property to allow for editing
     * multiple output expressions at once. */
    let propertyValues: Map<OutputProperty, OutputValueSet>;
    $: {
        // Make a set of all of the properties in the selection set
        const properties = new Set<OutputProperty>(
            outputs.reduce(
                (
                    all: OutputProperty[],
                    out: OutputExpression
                ): OutputProperty[] => [...all, ...out.getEditableProperties()],
                []
            )
        );
        propertyValues = new Map();
        // Map the properties to a set of values.
        for (const property of properties) {
            const values = new OutputValueSet(property.name, outputs);
            // Exclue any properties that happen to have no values.
            if (!values.isEmpty() && values.onAll())
                propertyValues.set(property, values);
        }
    }

    function addOutput() {
        const source = project.main;

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

<section class="palette" tabIndex="0">
    <h2
        >{$preferredTranslations.map((t) => t.ui.headers.editing).join(' ')}
        {outputs.map((output) => output.node.func.toWordplay()).join(', ')}
    </h2>
    <div class="actions">
        <Button
            tip={$preferredTranslations[0].ui.tooltip.addPhrase}
            action={addOutput}>+</Button
        >
    </div>

    {#each Array.from(propertyValues.entries()) as [property, values]}
        <div class="property">
            <h3 class="name">{values.getTranslation($preferredLanguages)} </h3>
            <Button
                tip={$preferredTranslations[0].ui.tooltip.revert}
                action={() => values.unset(project)}
                enabled={values.someGiven()}>⨉</Button
            >
            <div class="control">
                <!-- {#if valuesByProperty[property.name].some((val) => val?.value instanceof Expression)}
                            <RootView node={parseFunction(toTokens('ƒ()'))} /> -->
                {#if property.type instanceof OutputPropertyRange}
                    <BindSlider {property} {values} range={property.type} />
                {:else if property.type instanceof OutputPropertyOptions}
                    <BindOptions {property} {values} options={property.type} />
                {:else if property.type instanceof OutputPropertyText}
                    <BindText
                        {property}
                        {values}
                        validator={property.type.validator}
                    />
                {:else if property.type === 'color'}
                    <BindColor {property} {values} />
                {/if}
            </div>
        </div>
    {/each}
</section>

<style>
    .palette {
        background-color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        user-select: none;
        min-width: 100%;
        min-height: 100%;
        padding: var(--wordplay-spacing);

        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: left;
        gap: var(--wordplay-spacing);
    }

    .actions {
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .palette:focus {
        outline: none;
    }

    .property {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }

    .name {
        flex-basis: 5em;
        text-align: left;
    }

    .control {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
