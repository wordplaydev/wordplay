<script lang="ts">
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type OutputExpression from '@edit/output/OutputExpression';
    import type OutputProperty from '@edit/output/OutputProperty';
    import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import getSequenceProperties from '@edit/output/SequenceProperties';
    import { untrack } from 'svelte';
    import PaletteProperty from './PaletteProperty.svelte';

    interface Props {
        project: Project;
        outputs: OutputExpression[];
        editable: boolean;
        id?: string | undefined;
    }

    let { project, outputs, editable, id = undefined }: Props = $props();

    let SequenceProperties = $derived(getSequenceProperties(project, $locales));

    // Create a mapping from pose properties to values
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet> = $state(
        new Map(),
    );
    $effect(() => {
        propertyValues = new Map();

        // Map the properties to a set of values.
        for (const property of SequenceProperties) {
            const valueSet = new OutputPropertyValueSet(
                property,
                outputs,
                $locales,
            );
            // Exclue any properties that happen to have no values.
            if (!valueSet.isEmpty() && valueSet.onAll())
                untrack(() => propertyValues.set(property, valueSet));
        }
    });
</script>

<div class="sequence-properties" {id}>
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
