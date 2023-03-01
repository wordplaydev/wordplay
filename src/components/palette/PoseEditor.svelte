<script lang="ts">
    import type OutputProperty from '@transforms/OutputProperty';
    import OutputPropertyValueSet from '@transforms/OutputPropertyValueSet';
    import PoseProperties from '@transforms/PoseProperties';
    import PaletteProperty from './PaletteProperty.svelte';
    import type Project from '@models/Project';
    import type OutputExpression from '@transforms/OutputExpression';
    import Button from '../widgets/Button.svelte';
    import { SequenceType } from '@output/Sequence';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import Evaluate from '@nodes/Evaluate';
    import { reviseProject } from '@models/stores';
    import Reference from '@nodes/Reference';
    import MapLiteral from '@nodes/MapLiteral';
    import KeyValue from '@nodes/KeyValue';
    import MeasurementLiteral from '@nodes/MeasurementLiteral';
    import Unit from '@nodes/Unit';

    export let project: Project;
    export let outputs: OutputExpression[];
    export let sequence: boolean;

    // Create a mapping from pose properties to values
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet>;
    $: {
        propertyValues = new Map();

        // Map the properties to a set of values.
        for (const property of PoseProperties) {
            const valueSet = new OutputPropertyValueSet(property, outputs);
            // Exclue any properties that happen to have no values.
            if (!valueSet.isEmpty() && valueSet.onAll())
                propertyValues.set(property, valueSet);
        }
    }

    function convert() {
        reviseProject(
            outputs.map((output) => [
                output.node,
                Evaluate.make(
                    Reference.make(
                        SequenceType.names.getTranslation($preferredLanguages),
                        SequenceType
                    ),
                    [
                        MapLiteral.make([
                            KeyValue.make(
                                MeasurementLiteral.make(0, Unit.make(['%'])),
                                output.node
                            ),
                        ]),
                    ]
                ),
            ])
        );
    }
</script>

<div class="pose-properties">
    {#each Array.from(propertyValues.entries()) as [property, values]}
        <PaletteProperty {project} {property} {values} />
    {/each}
    {#if !sequence}
        <Button
            tip={$preferredTranslations[0].ui.tooltip.sequence}
            action={convert}>{SequenceType.getNames()[0]}</Button
        >
    {/if}
</div>

<style>
    .pose-properties {
        margin-left: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        border-left: solid var(--wordplay-border-color)
            var(--wordplay-border-width);

        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        width: 100%;
    }
</style>
