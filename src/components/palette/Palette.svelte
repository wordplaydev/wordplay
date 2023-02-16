<script lang="ts">
    import { preferredTranslations } from '@translation/translations';
    import { selectedOutput } from '../../models/stores';
    import type Project from '../../models/Project';
    import OutputValueSet from '@transforms/OutputPropertyValueSet';
    import type { PoseSelected } from './PoseChooser.svelte';
    import PoseChooser from './PoseChooser.svelte';
    import Evaluate from '@nodes/Evaluate';
    import PaletteProperty from './PaletteProperty.svelte';
    import { PoseType } from '@output/Pose';
    import { SequenceType } from '@output/Sequence';
    import MapLiteral from '@nodes/MapLiteral';
    import KeyValue from '@nodes/KeyValue';
    import MeasurementLiteral from '@nodes/MeasurementLiteral';
    import type OutputProperty from '@transforms/OutputProperty';
    import OutputExpression, {
        PoseProperties,
    } from '@transforms/OutputExpression';

    export let project: Project;

    /**
     * A state that represents which pose is being edited. The selection is one of the four
     * animation states -- enter, rest, move, exit -- and optionally a percent, if the selected
     * state is a sequence and not a pose.
     */
    let selectedPose: PoseSelected = { property: 'rest', percent: undefined };

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

    let posePropertyValues: Map<OutputProperty, OutputValueSet>;
    $: {
        // Create a list of the selected pose properties.
        const poses = outputs
            .map(
                (output) =>
                    output.getPropertyValue(selectedPose.property)?.expression
            )
            .map((expr) => {
                // If there's no percept, check if the expression is a pose, and if so, return it. Otherwise, return undefined.
                if (selectedPose.percent === undefined) {
                    if (
                        expr instanceof Evaluate &&
                        expr.is(PoseType, project.getNodeContext(expr))
                    )
                        return expr;
                    else return undefined;
                }
                // If the selection is a sequence, choose the pose corresponding to the percent selected.
                else {
                    if (
                        expr instanceof Evaluate &&
                        expr.is(SequenceType, project.getNodeContext(expr))
                    ) {
                        const poses = expr
                            .getInputMapping(SequenceType)
                            .inputs.find((mapping) =>
                                mapping.expected.names.hasName('poses')
                            );
                        if (
                            poses === undefined ||
                            !(poses instanceof MapLiteral)
                        )
                            return undefined;
                        return poses.values.find(
                            (val) =>
                                val instanceof KeyValue &&
                                val.key instanceof MeasurementLiteral &&
                                val.key.getValue().toNumber() ===
                                    selectedPose.percent
                        );
                    } else return undefined;
                }
            })
            .filter((pose): pose is Evaluate => pose instanceof Evaluate)
            .map((pose) => new OutputExpression(project, pose));

        posePropertyValues = new Map();
        // Map each property to a set of values based on the selected output.
        for (const property of PoseProperties) {
            const values = new OutputValueSet(property.name, poses);
            if (!values.isEmpty() && values.onAll())
                posePropertyValues.set(property, values);
        }
    }

    // function addOutput() {
    //     const source = project.main;

    //     // Make an empty phrase.
    //     const newPhrase = Evaluate.make(
    //         Reference.make(
    //             PhraseType.names.getTranslation($preferredLanguages),
    //             PhraseType
    //         ),
    //         [TextLiteral.make($preferredTranslations[0].welcome)]
    //     );

    //     // Get the output of the source's program block.
    //     const lastExpression = source.expression.expression.statements.at(-1);

    //     let revision: [Node, Node] | undefined = undefined;

    //     // There's a last expression
    //     if (lastExpression) {
    //         const context = project.getNodeContext(lastExpression);
    //         const type =
    //             lastExpression instanceof Evaluate
    //                 ? lastExpression.getFunction(context)
    //                 : undefined;

    //         // If it's a verse, add the new phrase to the verse's group
    //         if (type === VerseType) {
    //             const firstVerseInput =
    //                 lastExpression instanceof Evaluate
    //                     ? lastExpression.inputs[0]
    //                     : undefined;
    //             const firstVerseEvaluate =
    //                 firstVerseInput instanceof Evaluate
    //                     ? firstVerseInput
    //                     : undefined;
    //             const firstVerseType =
    //                 firstVerseInput instanceof Evaluate
    //                     ? firstVerseInput.getFunction(context)
    //                     : undefined;
    //             // If the verse group input is a group, append the phrase to the group.
    //             if (
    //                 firstVerseEvaluate &&
    //                 firstVerseType instanceof StructureDefinition &&
    //                 type.implements(GroupType, context)
    //             ) {
    //                 revision = [
    //                     firstVerseEvaluate,
    //                     firstVerseEvaluate.withInputAppended(newPhrase),
    //                 ];
    //             }
    //         }
    //         // If it's a phrase, create a verse to hold the existing phrase and the new phrase
    //         else if (type === PhraseType) {
    //             revision = [
    //                 lastExpression,
    //                 Evaluate.make(
    //                     Reference.make(
    //                         VerseType.names.getTranslation($preferredLanguages),
    //                         VerseType
    //                     ),
    //                     [
    //                         Evaluate.make(
    //                             Reference.make(
    //                                 StackType.names.getTranslation(
    //                                     $preferredLanguages
    //                                 ),
    //                                 StackType
    //                             ),
    //                             [lastExpression, newPhrase]
    //                         ),
    //                     ]
    //                 ),
    //             ];
    //         }
    //         // If it's a group...
    //         else if (
    //             type instanceof StructureDefinition &&
    //             type.implements(GroupType, context)
    //         ) {
    //         }
    //         // Otherwise, append the phrase.
    //         else {
    //             revision = [
    //                 source.expression.expression,
    //                 source.expression.expression.withStatement(newPhrase),
    //             ];
    //         }
    //     }
    //     // Nothing yet, just add the phrase to the program.
    //     else {
    //         revision = [
    //             source.expression.expression,
    //             source.expression.expression.withStatement(newPhrase),
    //         ];
    //     }

    //     if (revision) {
    //         reviseProject([revision]);
    //         selectedOutput.set([newPhrase]);
    //     }
    // }
</script>

<section class="palette" tabIndex="0">
    <h1
        >{$preferredTranslations.map((t) => t.ui.headers.editing).join(' ')}
        {outputs.map((output) => output.node.func.toWordplay()).join(', ')}
    </h1>
    <!-- <div class="actions">
        <Button
            tip={$preferredTranslations[0].ui.tooltip.addPhrase}
            action={addOutput}>+</Button
        >
    </div> -->

    {#each Array.from(propertyValues.entries()) as [property, values]}
        <PaletteProperty {project} {property} {values} />
    {/each}

    <!-- Show the pose values for the selected pose -->
    <PoseChooser bind:selection={selectedPose} />
    {#each Array.from(posePropertyValues.entries()) as [property, values] (property.name)}
        <PaletteProperty {project} {property} {values} />
    {/each}
</section>

<style>
    .palette {
        background-color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        user-select: none;
        min-width: 100%;
        min-height: 100%;
        padding: calc(2 * var(--wordplay-spacing));

        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: left;
        gap: calc(2 * var(--wordplay-spacing));
    }

    .palette:focus {
        outline: none;
    }
</style>
