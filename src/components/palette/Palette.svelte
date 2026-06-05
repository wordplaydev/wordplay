<script lang="ts">
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import EditOffer from '@components/palette/EditOffer.svelte';
    import {
        addGroup,
        addSoloPhrase,
        addStage,
        getSoloGroup,
        getSoloPhrase,
        getStage,
    } from '@components/palette/editOutput';
    import PaletteProperty from '@components/palette/PaletteProperty.svelte';
    import TextStyleEditor from '@components/palette/TextStyleEditor.svelte';
    import {
        getConceptIndex,
        getSelectedOutput,
        type EditorState,
    } from '@components/project/Contexts';
    import { DB, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import OutputExpression from '@edit/output/OutputExpression';
    import type OutputProperty from '@edit/output/OutputProperty';
    import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import Evaluate from '@nodes/Evaluate';
    import {
        GROUP_SYMBOL,
        PALETTE_SYMBOL,
        PHRASE_SYMBOL,
        STAGE_SYMBOL,
    } from '@parser/Symbols';
    import { tick, untrack } from 'svelte';

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

    // Keep a reference to the face so the text style editor can hide weight/italic
    // options the face doesn't support.
    let phraseFaceValues = $state<OutputPropertyValueSet | undefined>(
        undefined,
    );

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
            // Remember the phrase face property
            if (property.isName($locales, (l) => l.output.Phrase.face.names))
                phraseFaceValues = values;
        }
        propertyValues = newPropertyValues;
    });

    // The face name shared by all selected phrases, if any — used to constrain
    // the text style editor's weight/italic options to what the face supports.
    let sharedFaceName = $derived(phraseFaceValues?.getText());

    /** The localized name of the output input the caret is inside, used to scroll to and
     *  highlight the matching palette property. */
    let caretBind = $state<string | undefined>(undefined);

    /** When the caret changes, see if it is inside an editable output, and select it if so.
     *  Also figure out which of the output's inputs the caret is within, so we can scroll
     *  to and highlight the corresponding palette property. */
    $effect(() => {
        const currentCaret = editors.find((editor) => editor.focused)?.caret;
        if (currentCaret === undefined) return;
        if (currentCaret.getExpressionAt() === undefined) return;
        // Walk up from the token at the caret (not getExpressionAt(), which jumps to the
        // value and skips an input's NAME token), so the caret being in either the name or
        // the value of an input maps to that input.
        const node = currentCaret.getToken() ?? currentCaret.getExpressionAt();
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
                caretBind = undefined;
                return;
            }
            selection.setPaths(project, [output], 'editor');

            // The output's direct child on the path to the caret is the input the caret is
            // within; map it to its bind to highlight the matching palette property.
            const childOnPath = ancestors[ancestors.indexOf(output) - 1];
            const mapping =
                childOnPath === undefined
                    ? undefined
                    : output.getInputMapping(project.getNodeContext(output));
            const match = mapping?.inputs.find(
                (input) =>
                    input.given !== undefined &&
                    (input.given === childOnPath ||
                        (Array.isArray(input.given) &&
                            input.given.some(
                                (given) => given === childOnPath,
                            ))),
            );
            caretBind = match
                ? $locales.getName(match.expected.names)
                : undefined;
        });
    });

    let section = $state<HTMLElement | undefined>(undefined);

    /** When the caret moves into a property's input, scroll that property into view and
     *  highlight it (clearing any previous highlight), so the code caret makes the matching
     *  palette control easy to find. */
    $effect(() => {
        const name = caretBind;
        const view = section;
        if (view === undefined) return;
        tick().then(() => {
            // Clear the previous highlight so only the caret's current property is marked.
            for (const previous of view.querySelectorAll('.caret-highlight'))
                previous.classList.remove('caret-highlight');
            if (name === undefined) return;
            const control = view.querySelector(`#property-${CSS.escape(name)}`);
            const row = control?.closest('.property') ?? control;
            if (row instanceof HTMLElement) {
                row.scrollIntoView({ block: 'nearest' });
                row.classList.add('caret-highlight');
            }
        });
    });
</script>

<section
    class="palette"
    data-testid="palette"
    data-uiid="palette"
    aria-label={$locales.getPlainText((l) => l.ui.palette.label)}
    bind:this={section}
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
                <TextStyleEditor
                    {project}
                    outputs={phraseTextValues}
                    faceName={sharedFaceName}
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

    /* Highlight the property whose input the code caret is in. */
    :global(.property.caret-highlight) {
        background-color: var(--wordplay-hover-light);
        border-radius: var(--wordplay-border-radius);
    }
</style>
