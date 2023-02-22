<script lang="ts">
    import { preferredTranslations } from '@translation/translations';
    import { selectedOutput } from '../../models/stores';
    import type Project from '../../models/Project';
    import OutputPropertyValueSet from '@transforms/OutputPropertyValueSet';
    import PaletteProperty from './PaletteProperty.svelte';
    import type OutputProperty from '@transforms/OutputProperty';
    import OutputExpression from '@transforms/OutputExpression';
    import Speech from '../lore/Speech.svelte';
    import Emotion from '../../lore/Emotion';
    import { getConceptIndex } from '../project/Contexts';

    export let project: Project;

    let index = getConceptIndex();

    /** Transform the selected Evaluate nodes into Output wrappers, filtering out anything that's not valid output. */
    $: outputs = $selectedOutput
        .map((evaluate) => new OutputExpression(project, evaluate))
        .filter((out) => out.isOutput());
    $: definition = outputs[0].node.getFunction(
        project.getNodeContext(outputs[0].node)
    );

    /**
     * From the list of OutputExpressions, generate a value set for each property to allow for editing
     * multiple output expressions at once. */
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet>;
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
            const values = new OutputPropertyValueSet(property, outputs);
            // Exclue any properties that happen to have no values.
            if (!values.isEmpty() && values.onAll())
                propertyValues.set(property, values);
        }
    }
</script>

<section class="palette" tabIndex="0">
    <Speech
        glyph={{
            symbols: outputs
                .map((output) => output.node.func.toWordplay())
                .join(', '),
            emotion: Emotion.Cheerful,
        }}
        concept={outputs.length > 1 || definition === undefined
            ? undefined
            : $index?.getStructureConcept(definition)}
    >
        {$preferredTranslations.map((t) => t.ui.headers.editing).join(' ')}
    </Speech>

    {#each Array.from(propertyValues.entries()) as [property, values]}
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
        gap: var(--wordplay-spacing);
    }

    .palette:focus {
        outline: none;
    }
</style>
