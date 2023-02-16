<script lang="ts">
    import type OutputProperty from '@transforms/OutputProperty';
    import OutputPropertyValueSet from '@transforms/OutputPropertyValueSet';
    import PoseProperties from '@transforms/PoseProperties';
    import OutputExpression from '@transforms/OutputExpression';
    import PaletteProperty from './PaletteProperty.svelte';
    import type Project from '../../models/Project';
    import Evaluate from '@nodes/Evaluate';

    export let project: Project;
    export let values: OutputPropertyValueSet;

    // Create a mapping from pose properties to values
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet>;
    $: {
        propertyValues = new Map();

        // Map the properties to a set of values.
        for (const property of PoseProperties) {
            const valueSet = new OutputPropertyValueSet(
                property,
                values.values
                    .filter(
                        (value) =>
                            value.given && value.expression instanceof Evaluate
                    )
                    .map(
                        (value) =>
                            new OutputExpression(
                                project,
                                value.expression as Evaluate
                            )
                    ) as OutputExpression[]
            );
            // Exclue any properties that happen to have no values.
            if (!valueSet.isEmpty() && valueSet.onAll())
                propertyValues.set(property, valueSet);
        }
    }
</script>

<div class="pose-properties">
    {#each Array.from(propertyValues.entries()) as [property, values]}
        <PaletteProperty {project} {property} {values} />
    {/each}
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
        align-items: left;
        gap: calc(2 * var(--wordplay-spacing));
        width: 100%;
    }
</style>
