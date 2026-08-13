<script lang="ts">
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import EditOffer from '@components/palette/EditOffer.svelte';
    import {
        addGroup,
        addShape,
        addSoloPhrase,
        addMusic,
        addStage,
        classifyOutput,
        getStage,
        offersFor,
    } from '@components/palette/editOutput';
    import MIDIImporter from '@components/palette/MIDIImporter.svelte';
    import MusicChooser from '@components/palette/MusicChooser.svelte';
    import MusicEditor from '@components/palette/MusicEditor.svelte';
    import PaletteProperty from '@components/palette/PaletteProperty.svelte';
    import TextStyleEditor from '@components/palette/TextStyleEditor.svelte';
    import {
        deriveSteppedEvaluation,
        getConceptIndex,
        getEvaluation,
        getPaletteOpen,
        getSelectedOutput,
        type EditorState,
    } from '@components/project/Contexts';
    import type { ProjectMode } from '@components/project/ProjectMode';
    import outputAtCaret from '@components/project/outputAtCaret';
    import Button from '@components/widgets/Button.svelte';
    import { DB, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type Caret from '@edit/caret/Caret';
    import OutputExpression from '@edit/output/OutputExpression';
    import type OutputProperty from '@edit/output/OutputProperty';
    import OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import Evaluate from '@nodes/Evaluate';
    import type Expression from '@nodes/Expression';
    import type Value from '@values/Value';
    import {
        GROUP_SYMBOL,
        PALETTE_SYMBOL,
        PHRASE_SYMBOL,
        MUSIC_SYMBOL,
        STAGE_SYMBOL,
    } from '@parser/Symbols';
    import { tick, untrack } from 'svelte';

    interface Props {
        project: Project;
        editable: boolean;
        /** The project's current evaluation mode; fields are read-only outside edit mode. */
        mode?: ProjectMode;
        /** Switches the project to edit mode; undefined when the project isn't editable. */
        enterEditMode?: (() => void) | undefined;
        editors: EditorState[];
    }

    let {
        project,
        editable,
        mode = 'edit',
        enterEditMode = undefined,
        editors,
    }: Props = $props();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let selection = getSelectedOutput();

    /** A play-rate-decoupled view of the evaluation, for the debug-mode values
     *  below. The palette isn't inside an Editor, so it derives its own copy
     *  rather than using the editor-subtree context; the decoupling matters for
     *  the same reason (values are hidden while playing, so ~60 Hz broadcasts
     *  would re-run the derivation for nothing). */
    const evaluation = getEvaluation();
    const stepped =
        evaluation !== undefined
            ? deriveSteppedEvaluation(evaluation)
            : undefined;

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

    // The kind of the program's rendered output, and whether a Stage already exists anywhere — used
    // to offer only type-correct output-creation actions when nothing is selected.
    let output = $derived(classifyOutput(project));
    let outputKind = $derived(output.kind);
    let stageExists = $derived(getStage(project) !== undefined);
    let offers = $derived(offersFor(outputKind, stageExists, output.isList));

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

    /** Each property's source expression, resolved once per selection change.
     *  Kept apart from the per-step value lookup below because getExpression()
     *  deep-compares the expression across every selected output — fine once
     *  per selection, wasteful on every scrub event. Only given expressions
     *  qualify: a default lives in the shared output definition, so its latest
     *  value could belong to any output on stage, not the selected one. */
    let debugExpressions = $derived.by(() => {
        const found = new Map<OutputProperty, Expression>();
        for (const [property, values] of propertyValues) {
            if (!values.areSet()) continue;
            const expression = values.getExpression();
            if (expression !== undefined) found.set(property, expression);
        }
        return found;
    });

    /** In debug mode, the latest evaluated value of each property's expression,
     *  mirroring the editor's inline values. Recomputed per step; each entry is
     *  a single evaluator history lookup. */
    let debugValues = $derived.by(() => {
        const context = stepped !== undefined ? $stepped : undefined;
        if (context === undefined || context.mode !== 'debug')
            return undefined;
        const found = new Map<OutputProperty, Value>();
        for (const [property, expression] of debugExpressions) {
            const value =
                context.evaluator.getLatestExpressionValue(expression);
            if (value !== undefined) found.set(property, value);
        }
        return found;
    });

    /** The localized name of the output input the caret is inside — a pure function of the
     *  caret, so it always reflects the current position (undefined when the caret isn't in
     *  a property). Used to reactively highlight and scroll to the matching palette property. */
    let caretBind = $derived.by(() => {
        const caret = editors.find((editor) => editor.focused)?.caret;
        if (caret === undefined) return undefined;
        // Walk up from the token at the caret (not getExpressionAt(), which jumps to the
        // value and skips an input's NAME token), so the caret being in either the name or
        // the value of an input maps to that input.
        const node = caret.getToken() ?? caret.getExpressionAt();
        if (node === undefined) return undefined;
        const ancestors = [node, ...caret.source.root.getAncestors(node)];
        const output = ancestors.find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.isOneOf(
                    project.getNodeContext(n),
                    project.shares.output.Phrase,
                    project.shares.output.Group,
                    project.shares.output.Shape,
                    project.shares.output.Stage,
                    project.shares.output.Music,
                ),
        );
        if (output === undefined) return undefined;
        // The output's direct child on the path to the caret is the input the caret is
        // within; map it to its bind name to match a palette property.
        const childOnPath = ancestors[ancestors.indexOf(output) - 1];
        if (childOnPath === undefined) return undefined;
        const match = output
            .getInputMapping(project.getNodeContext(output))
            ?.inputs.find(
                (input) =>
                    input.given !== undefined &&
                    (input.given === childOnPath ||
                        (Array.isArray(input.given) &&
                            input.given.some(
                                (given) => given === childOnPath,
                            ))),
            );
        return match ? $locales.getName(match.expected.names) : undefined;
    });

    /** When the caret is inside an editable output, select it so its palette shows. This is the
     *  only caret↔selection sync there is: it lives here because a selection with no palette on
     *  screen has nothing to explain it, and this component exists only while the tile does. */
    let lastCaret: Caret | undefined = undefined;
    $effect(() => {
        const caret = editors.find((editor) => editor.focused)?.caret;
        // No focused editor means the stage owns the selection (a click there sets it
        // and then reveals this tile); don't overwrite it with whatever the caret is on.
        if (caret === undefined) return;
        const output = outputAtCaret(caret, project);
        untrack(() => {
            if (selection === undefined) return;
            // Don't re-derive the selection from the caret mid-drag — a handle drag's revises
            // shift the caret, and clearing/re-selecting here would drop the dragged output.
            if (selection.dragging) return;
            const moved = lastCaret !== undefined && lastCaret !== caret;
            lastCaret = caret;
            // A selection already made when this tile appears came from the gesture that opened
            // it — a double-click on stage, which selects and then reveals us. The editor can
            // still report itself focused at that moment, so only an actual caret move replaces
            // that selection. With nothing selected, opening the palette still adopts the caret's
            // output, which is how the tile toggle is expected to behave.
            if (!moved && !selection.isEmpty()) return;
            if (output === undefined) selection.empty();
            else selection.setPaths(project, [output], 'editor');
        });
    });

    /** The palette is the only thing on screen that explains an output selection, and this
     *  component is unmounted whenever its tile isn't visible (collapsed, another tile
     *  fullscreen, or a one-tile-at-a-time arrangement). Clear the selection as it goes,
     *  so a stale one can't keep underlining code with nothing to explain it. Tying this to
     *  the component's lifetime rather than to a visibility test keeps it correct for every
     *  route that hides the tile. (Entering play mode no longer hides this tile; setUIMode
     *  clears the selection for that route, since playing disables selection.) */
    $effect(() => () => {
        if (selection && !selection.dragging && !selection.interacting)
            selection.empty();
    });

    /** Output selection and the chrome that explains it are features of this tile, so the
     *  stage needs to know when it's here. Published from this component's own lifetime,
     *  the same signal the clearing above uses, so the two can never disagree. */
    const paletteOpen = getPaletteOpen();
    $effect(() => {
        paletteOpen?.set(true);
        return () => paletteOpen?.set(false);
    });

    let section = $state<HTMLElement | undefined>(undefined);

    /** Scroll the caret's property into view (the highlight itself is applied reactively
     *  via the `highlighted` prop on each property). */
    $effect(() => {
        const name = caretBind;
        const view = section;
        if (name === undefined || view === undefined) return;
        tick().then(() =>
            view
                .querySelector('.property.caret-highlight')
                ?.scrollIntoView({ block: 'nearest' }),
        );
    });
</script>

<section
    class="palette"
    data-testid="palette"
    data-uiid="palette"
    aria-label={$locales.getPrimaryPlainText((l) => l.ui.palette.label)}
    bind:this={section}
>
    <!-- The switch-to-edit prompt, shown inside speech bubbles in step and play modes. -->
    {#snippet readonlyPrompt()}
        <MarkupHtmlView markup={(l) => l.ui.palette.prompt.readonly} />
        {#if enterEditMode}
            <Button
                background
                tip={(l) => l.ui.palette.button.editMode}
                action={enterEditMode}
                label={(l) => l.ui.palette.button.editMode}
                icon="✏️"
            />
        {/if}
    {/snippet}
    {#if propertyValues.size > 0}
        <Speech
            eyes
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
                <!-- In step and play modes, explain that values are read-only and offer
                     a switch to edit mode instead of prompting to edit. -->
                {#if mode === 'edit'}
                    <MarkupHtmlView
                        markup={(l) => l.ui.palette.prompt.editing}
                    />
                {:else}
                    {@render readonlyPrompt()}
                {/if}
            {/snippet}
        </Speech>

        <!-- Which music, before the properties that describe it. -->
        {#if outputs.length === 1 && definition === project.shares.output.Music}
            <MusicChooser {project} music={outputs[0].node} {editable} />
        {/if}

        <!-- Something selected? Show the property values. -->
        {#each Array.from(propertyValues.entries()) as [property, values]}
            <PaletteProperty
                {project}
                {property}
                {values}
                {editable}
                value={debugValues?.get(property)}
                highlighted={property.getName($locales) === caretBind}
            />
            <!-- Add the text style editor just below the face chooser. -->
            {#if property.isName($locales, (l) => l.output.Phrase.face.names) && phraseTextValues}
                <TextStyleEditor
                    {project}
                    outputs={phraseTextValues}
                    faceName={sharedFaceName}
                ></TextStyleEditor>
            {/if}
        {/each}
        <!-- The music editor sits below the music's own properties, since it
             edits the tracks those properties apply to. Only for a single
             selection: a carousel over two musics' tracks would have no
             coherent "this track". -->
        {#if outputs.length === 1 && definition === project.shares.output.Music}
            <MusicEditor {project} music={outputs[0].node} {editable} />
        {/if}
    {:else if mode !== 'edit' && enterEditMode !== undefined}
        <!-- Nothing selected in step or play mode? Explain how to get back to editing. -->
        <Speech eyes character={{ symbols: PALETTE_SYMBOL }}
            >{#snippet content()}{@render readonlyPrompt()}{/snippet}</Speech
        >
    {:else if editable}
        {#if selection === undefined || selection.isEmpty()}
            <Speech eyes character={{ symbols: PALETTE_SYMBOL }}
                >{#snippet content()}
                    <MarkupHtmlView
                        markup={(l) => l.ui.palette.prompt.select}
                    />{/snippet}</Speech
            >
        {/if}
        {#if offers.includes('placeholder')}
            <EditOffer
                symbols={PHRASE_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerNothing}
                tip={(l) => l.ui.palette.button.createPhrase}
                action={() => addSoloPhrase(DB, project)}
                command={`+${PHRASE_SYMBOL}`}
            />
        {/if}
        {#if offers.includes('phrase')}
            <EditOffer
                symbols={PHRASE_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerPhrase}
                tip={(l) => l.ui.palette.button.createPhrase}
                action={() => addSoloPhrase(DB, project)}
                command={`+${PHRASE_SYMBOL}`}
            />
        {/if}
        {#if offers.includes('shape')}
            {@const shapeName = project.shares.output.Shape.getNames()[0]}
            <EditOffer
                symbols={shapeName}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerShape}
                tip={(l) => l.ui.palette.button.addShape}
                action={() => addShape(DB, project)}
                command={`+${shapeName}`}
            />
        {/if}
        {#if offers.includes('group')}
            <EditOffer
                symbols={GROUP_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerGroup}
                tip={(l) => l.ui.palette.button.createGroup}
                action={() => addGroup(DB, project)}
                command={`+${GROUP_SYMBOL}`}
            />
        {/if}
        {#if offers.includes('stage')}
            <EditOffer
                symbols={STAGE_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerStage}
                tip={(l) => l.ui.palette.button.createStage}
                action={() => addStage(DB, project)}
                command={`+${STAGE_SYMBOL}`}
            />
        {/if}
        {#if offers.includes('music')}
            <EditOffer
                symbols={MUSIC_SYMBOL}
                locales={$locales}
                message={(l) => l.ui.palette.prompt.offerMusic}
                tip={(l) => l.ui.palette.button.createMusic}
                action={() => addMusic(DB, project)}
                command={`+${MUSIC_SYMBOL}`}
            >
                <!-- Beside the button rather than below it: importing a song is
                     the other way to get music, not a lesser one, and needing a
                     music before you can import one is backwards. -->
                {#snippet also()}
                    <MIDIImporter {project} {editable} />
                {/snippet}
            </EditOffer>
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

    /* Highlight the property whose input the code caret is in. A solid bar
       appears alongside the faint tint so the correspondence doesn't ride on
       a low-alpha color alone; the row reserves the bar's space. */
    :global(.property.caret-highlight) {
        background-color: var(--wordplay-hover-light);
        border-radius: var(--wordplay-border-radius);
        border-inline-start-color: var(--wordplay-highlight-color);
    }
</style>
