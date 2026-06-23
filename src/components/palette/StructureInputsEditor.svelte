<script lang="ts">
    import PaletteProperty from '@components/palette/PaletteProperty.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type OutputExpression from '@edit/output/OutputExpression';
    import type OutputProperty from '@edit/output/OutputProperty';
    import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import type { Snippet } from 'svelte';

    interface Props {
        project: Project;
        /** The nested Evaluates being edited (e.g. the Matter/Rectangle/Placement values). */
        outputs: OutputExpression[];
        /** The properties of the nested type to expose. */
        properties: OutputProperty[];
        editable: boolean;
        id?: string | undefined;
        /** Optional content rendered before the properties (e.g. a type picker). */
        header?: Snippet;
        /** Optional content rendered after the properties (e.g. a convert button). */
        children?: Snippet;
    }

    let {
        project,
        outputs,
        properties,
        editable,
        id = undefined,
        header,
        children,
    }: Props = $props();

    // Map each property to its value set across the nested Evaluates, dropping ones with no
    // value or not present on all (e.g. a mixed multi-selection).
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet> =
        $derived.by(() => {
            const map = new Map<OutputProperty, OutputPropertyValueSet>();
            for (const property of properties) {
                const valueSet = new OutputPropertyValueSet(
                    property,
                    outputs,
                    $locales,
                );
                if (!valueSet.isEmpty() && valueSet.onAll())
                    map.set(property, valueSet);
            }
            return map;
        });
</script>

<div class="structure-inputs" {id}>
    {@render header?.()}
    {#each Array.from(propertyValues.entries()) as [property, values]}
        <PaletteProperty {project} {property} {values} {editable} />
    {/each}
    {@render children?.()}
</div>

<style>
    .structure-inputs {
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
