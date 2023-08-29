<script lang="ts">
    import type Project from '@models/Project';
    import OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import PaletteProperty from './PaletteProperty.svelte';
    import type OutputProperty from '@edit/OutputProperty';
    import OutputExpression from '@edit/OutputExpression';
    import Speech from '../lore/Speech.svelte';
    import {
        getConceptIndex,
        getEvaluation,
        getSelectedOutput,
    } from '../project/Contexts';
    import { DB, locale } from '../../db/Database';
    import concretize from '../../locale/concretize';
    import {
        addGroup,
        addSoloPhrase,
        addStage,
        getSoloGroup,
        getSoloPhrase,
        getStage,
        hasOutput,
    } from './editOutput';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import {
        GROUP_SYMBOL,
        PALETTE_SYMBOL,
        PHRASE_SYMBOL,
        STAGE_SYMBOL,
    } from '../../parser/Symbols';
    import EditOffer from './EditOffer.svelte';

    export let project: Project;
    export let editable: boolean;

    let evaluation = getEvaluation();
    let index = getConceptIndex();
    let selectedOutput = getSelectedOutput();

    /** Transform the selected Evaluate nodes into Output wrappers, filtering out anything that's not valid output. */
    $: outputs = $selectedOutput
        ? $selectedOutput
              .map((evaluate) => new OutputExpression(project, evaluate))
              .filter((out) => out.isOutput())
        : [];
    $: definition = outputs[0]?.node.getFunction(
        project.getNodeContext(outputs[0].node)
    );

    $: phrase = getSoloPhrase(project);
    $: group = getSoloGroup(project);
    $: stage = getStage(project);

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

<section class="palette" aria-label={$locale.ui.palette.label}>
    {#if propertyValues.size > 0}
        <Speech
            glyph={(outputs.length > 1 || definition === undefined
                ? undefined
                : $index?.getStructureConcept(definition)) ?? {
                symbols:
                    outputs.length === 0
                        ? '🎨'
                        : outputs
                              .map((output) => output.node.fun.toWordplay())
                              .join(', '),
            }}
        >
            <svelte:fragment slot="content">
                <MarkupHtmlView
                    markup={concretize(
                        $locale,
                        $locale.ui.palette.prompt.editing
                    )}
                />
            </svelte:fragment>
        </Speech>

        <!-- Something selected? Show the property values. -->
        {#each Array.from(propertyValues.entries()) as [property, values]}
            <PaletteProperty {project} {property} {values} {editable} />
        {/each}
    {:else}
        {#if $evaluation.playing && hasOutput(project)}
            <EditOffer
                symbols={PALETTE_SYMBOL}
                locale={$locale}
                message={$locale.ui.palette.prompt.pauseToEdit}
                tip={$locale.ui.timeline.button.pause}
                action={() => $evaluation.evaluator.pause()}
                command="⏸️"
            />
        {/if}
        {#if editable}
            {#if phrase === undefined}
                <EditOffer
                    symbols={PHRASE_SYMBOL}
                    locale={$locale}
                    message={$locale.ui.palette.prompt.offerPhrase}
                    tip={$locale.ui.palette.button.createPhrase}
                    action={() => addSoloPhrase(DB, project)}
                    command={`+${PHRASE_SYMBOL}`}
                />
            {/if}
            {#if phrase !== undefined && stage === undefined}
                <EditOffer
                    symbols={GROUP_SYMBOL}
                    locale={$locale}
                    message={$locale.ui.palette.prompt.offerGroup}
                    tip={$locale.ui.palette.button.createGroup}
                    action={() => addGroup(DB, project)}
                    command={`+${GROUP_SYMBOL}`}
                />
            {/if}
            {#if stage === undefined}
                <EditOffer
                    symbols={STAGE_SYMBOL}
                    locale={$locale}
                    message={$locale.ui.palette.prompt.offerStage}
                    tip={$locale.ui.palette.button.createStage}
                    action={() => addStage(DB, project, group ?? phrase)}
                    command={`+${STAGE_SYMBOL}`}
                />
            {/if}
        {/if}
    {/if}
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
