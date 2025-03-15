<script lang="ts">
    import type Project from '@db/projects/Project';
    import OutputExpression from '@edit/OutputExpression';
    import type OutputProperty from '@edit/OutputProperty';
    import OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import Evaluate from '@nodes/Evaluate';
    import { untrack } from 'svelte';
    import { DB, locales } from '../../db/Database';
    import {
        GROUP_SYMBOL,
        PALETTE_SYMBOL,
        PHRASE_SYMBOL,
        STAGE_SYMBOL,
    } from '../../parser/Symbols';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import {
        getConceptIndex,
        getSelectedOutput,
        type EditorState,
    } from '../project/Contexts';
    import EditOffer from './EditOffer.svelte';
    import {
        addGroup,
        addSoloPhrase,
        addStage,
        getSoloGroup,
        getSoloPhrase,
        getStage,
    } from './editOutput';
    import PaletteProperty from './PaletteProperty.svelte';
    import TextStyleEditor from './TextStyleEditor.svelte';

    interface Props {
        project: Project;
        editable: boolean;
        editors: EditorState[];
    }

    let { project, editable, editors }: Props = $props();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let selection = getSelectedOutput();

    /** Transform the selected Evaluate nodes into Output wrappers, filtering out anything that's not valid output. */
    let outputs = $derived(
        selection !== undefined
            ? selection
                  .getOutput(project)
                  .map(
                      (evaluate) =>
                          new OutputExpression(project, evaluate, $locales),
                  )
                  .filter((out) => out.isOutput())
            : [],
    );

    let definition = $derived(
        outputs[0]?.node.getFunction(project.getNodeContext(outputs[0].node)),
    );

    let phrase = $derived(getSoloPhrase(project));
    let group = $derived(getSoloGroup(project));
    let stage = $derived(getStage(project));

    // Keep a reference to the text, since we need to pass that to the text style.
    let phraseTextValues: OutputPropertyValueSet | undefined =
        $state(undefined);

    /**
     * From the list of OutputExpressions, generate a value set for each property to allow for editing
     * multiple output expressions at once. */
    let propertyValues: Map<OutputProperty, OutputPropertyValueSet> = $state(
        new Map(),
    );

    $effect(() => {
        // Make a set of all of the properties in the selection set
        const properties = new Set<OutputProperty>(
            outputs.reduce(
                (
                    all: OutputProperty[],
                    out: OutputExpression,
                ): OutputProperty[] => [...all, ...out.getEditableProperties()],
                [],
            ),
        );
        const newPropertyValues = new Map();
        // Map the properties to a set of values.
        for (const property of properties) {
            const values = new OutputPropertyValueSet(
                property,
                outputs,
                $locales,
            );
            // Exclue any properties that happen to have no values.
            if (!values.isEmpty() && values.onAll())
                newPropertyValues.set(property, values);
            // Remember the phrase text property
            if (property.isName($locales, (l) => l.output.Phrase.text.names))
                phraseTextValues = values;
        }
        propertyValues = newPropertyValues;
    });

    /** When the caret changes, see if it is inside an editable output, and select it if so. */
    $effect(() => {
        const currentCaret = editors.find((editor) => editor.focused)?.caret;
        if (currentCaret === undefined) return;
        const node = currentCaret.getExpressionAt();
        if (node === undefined) return;
        const ancestors = [
            node,
            ...currentCaret.source.root.getAncestors(node),
        ];

        untrack(() => {
            if (selection === undefined) return;

            const output = ancestors.find(
                (node): node is Evaluate =>
                    node instanceof Evaluate &&
                    node.isOneOf(
                        project.getNodeContext(node),
                        project.shares.output.Phrase,
                        project.shares.output.Group,
                        project.shares.output.Stage,
                    ),
            );
            if (output === undefined) {
                selection.empty();
            } else selection.setPaths(project, [output], 'editor');
        });
    });
</script>

<section
    class="palette"
    data-testid="palette"
    aria-label={$locales.get((l) => l.ui.palette.label)}
>
    {#if propertyValues.size > 0}
        <Speech
            character={(outputs.length > 1 || definition === undefined
                ? undefined
                : index?.getStructureConcept(definition)) ?? {
                symbols:
                    outputs.length === 0
                        ? '🎨'
                        : outputs
                              .map((output) => output.node.fun.toWordplay())
                              .join(', '),
            }}
        >
            {#snippet content()}
                <MarkupHtmlView markup={(l) => l.ui.palette.prompt.editing} />
            {/snippet}
        </Speech>

        <!-- Something selected? Show the property values. -->
        {#each Array.from(propertyValues.entries()) as [property, values]}
            <PaletteProperty {project} {property} {values} {editable} />
            <!-- Add the text style editor just below the face chooser. -->
            {#if property.isName($locales, (l) => l.output.Phrase.face.names) && phraseTextValues}
                <TextStyleEditor {project} outputs={phraseTextValues}
                ></TextStyleEditor>
            {/if}
        {/each}
    {:else if editable}
        {#if selection === undefined || selection.isEmpty()}
            <Speech character={{ symbols: PALETTE_SYMBOL }}
                >{#snippet content()}
                    <MarkupHtmlView
                        markup={(l) => l.ui.palette.prompt.select}
                    />{/snippet}</Speech
            >
        {/if}
        {#if stage === undefined && phrase === undefined}
            <EditOffer
                symbols={PHRASE_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerPhrase}
                tip={(l) => l.ui.palette.button.createPhrase}
                action={() => addSoloPhrase(DB, project)}
                command={`+${PHRASE_SYMBOL}`}
            />
        {/if}
        {#if phrase !== undefined && stage === undefined}
            <EditOffer
                symbols={GROUP_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerGroup}
                tip={(l) => l.ui.palette.button.createGroup}
                action={() => addGroup(DB, project)}
                command={`+${GROUP_SYMBOL}`}
            />
        {/if}
        {#if stage === undefined}
            <EditOffer
                symbols={STAGE_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerStage}
                tip={(l) => l.ui.palette.button.createStage}
                action={() => addStage(DB, project, group ?? phrase)}
                command={`+${STAGE_SYMBOL}`}
            />
        {/if}
        {#if stage === undefined && phrase === undefined}
            <EditOffer
                symbols={PHRASE_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerPhrase}
                tip={(l) => l.ui.palette.button.createPhrase}
                action={() => addSoloPhrase(DB, project)}
                command={`+${PHRASE_SYMBOL}`}
            />
        {/if}
        {#if phrase !== undefined && stage === undefined}
            <EditOffer
                symbols={GROUP_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerGroup}
                tip={(l) => l.ui.palette.button.createGroup}
                action={() => addGroup(DB, project)}
                command={`+${GROUP_SYMBOL}`}
            />
        {/if}
        {#if stage === undefined}
            <EditOffer
                symbols={STAGE_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerStage}
                tip={(l) => l.ui.palette.button.createStage}
                action={() => addStage(DB, project, group ?? phrase)}
                command={`+${STAGE_SYMBOL}`}
            />
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
