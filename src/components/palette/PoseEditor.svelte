<script lang="ts">
    import type OutputProperty from '@edit/OutputProperty';
    import OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import PaletteProperty from './PaletteProperty.svelte';
    import type Project from '@models/Project';
    import type OutputExpression from '@edit/OutputExpression';
    import Button from '../widgets/Button.svelte';
    import Evaluate from '@nodes/Evaluate';
    import Reference from '@nodes/Reference';
    import MapLiteral from '@nodes/MapLiteral';
    import KeyValue from '@nodes/KeyValue';
    import NumberLiteral from '@nodes/NumberLiteral';
    import { Projects, locales } from '@db/Database';
    import getPoseProperties from '@edit/PoseProperties';

    export let project: Project;
    // takes in a list of outputexpressions to modify
    export let outputs: OutputExpression[];
    export let sequence: boolean;
    export let editable: boolean;

    $: PoseProperties = getPoseProperties(project, $locales, false);

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
        Projects.revise(
            project,
            outputs.map((output) => [
                output.node,
                Evaluate.make(
                    Reference.make(
                        $locales.getName(project.shares.output.Sequence.names),
                        project.shares.output.Sequence,
                    ),
                    [
                        MapLiteral.make([
                            KeyValue.make(
                                NumberLiteral.make('0%'),
                                output.node,
                            ),
                        ]),
                    ],
                ),
            ]),
        );
    }
</script>

<div class="pose-properties">
    {#each Array.from(propertyValues.entries()) as [property, values]}
        <PaletteProperty {project} {property} {values} {editable} />
    {/each}
    {#if !sequence && editable}
        <Button
            tip={$locales.get((l) => l.ui.palette.button.sequence)}
            action={convert}
            >{project.shares.output.Sequence.getNames()[0]}
            {$locales.get((l) => l.ui.palette.button.sequence)}</Button
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
