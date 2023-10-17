<script lang="ts">
    import type OutputProperty from '@edit/OutputProperty';
    import OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import PaletteProperty from './PaletteProperty.svelte';
    import type Project from '@models/Project';
    import type OutputExpression from '@edit/OutputExpression';
    import { locales } from '@db/Database';
    import getSequenceProperties from '../../edit/SequenceProperties';

    export let project: Project;
    export let outputs: OutputExpression[];
    export let editable: boolean;

    $: SequenceProperties = getSequenceProperties(project, $locales);

    // Create a mapping from pose properties to values
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet>;
    $: {
        propertyValues = new Map();

        // Map the properties to a set of values.
        for (const property of SequenceProperties) {
            const valueSet = new OutputPropertyValueSet(property, outputs);
            // Exclue any properties that happen to have no values.
            if (!valueSet.isEmpty() && valueSet.onAll())
                propertyValues.set(property, valueSet);
        }
    }
</script>

<div class="sequence-properties">
    {#each Array.from(propertyValues.entries()) as [property, values]}
        <PaletteProperty {project} {property} {values} {editable} />
    {/each}
</div>

<style>
    .sequence-properties {
        margin-left: var(--wordplay-spacing);
        padding-left: var(--wordplay-spacing);
        border-left: solid var(--wordplay-border-color)
            var(--wordplay-border-width);

        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: left;
        gap: var(--wordplay-spacing);
        width: 100%;
    }
</style>
