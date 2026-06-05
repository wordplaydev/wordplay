<script lang="ts">
    import {
        getProject,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import SequencePreview from '@components/palette/SequencePreview.svelte';
    import getSequencePreviews, {
        buildSequencePreview,
    } from '@components/palette/sequencePreviews';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Slider from '@components/widgets/Slider.svelte';
    import { locales, Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type OutputExpression from '@edit/output/OutputExpression';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type LocaleText from '@locale/LocaleText';
    import { createDefaultPosesMap } from '@edit/output/SequenceProperties';
    import type Bind from '@nodes/Bind';
    import Evaluate from '@nodes/Evaluate';
    import type Expression from '@nodes/Expression';
    import MapLiteral from '@nodes/MapLiteral';
    import type FunctionDefinition from '@nodes/FunctionDefinition';
    import NumberLiteral from '@nodes/NumberLiteral';
    import NumberType from '@nodes/NumberType';
    import Reference from '@nodes/Reference';
    import Unit from '@nodes/Unit';
    import { parseNumber } from '@parser/parseExpression';
    import { toTokens } from '@parser/toTokens';
    import type Decimal from 'decimal.js';

    interface Props {
        project: Project;
        // The OutputExpressions wrapping the Sequence Evaluates being edited.
        outputs: OutputExpression[];
        editable: boolean;
        id?: string | undefined;
    }

    let { project, outputs, editable, id = undefined }: Props = $props();

    const selection = getSelectedOutput();
    const projectStore = getProject();

    /** The value used in the dropdown for a hand-written poses map. */
    const CUSTOM = 'custom';

    // Looping preview animations for each preset, keyed by preset key. Memoized per locale.
    let previews = $derived(getSequencePreviews($locales));
    // The dropdown option currently focused via keyboard, and the one currently hovered.
    // Both animate (so the keyboard-focused and pointer-hovered options preview at once).
    let focusedKey: string | undefined = $state(undefined);
    let hoveredKey: string | undefined = $state(undefined);

    // The available pre-defined sequences, as [key, definition] pairs.
    let presets = $derived(Object.entries(project.shares.sequences));

    // The dropdown options. Derived from presets + locale only (NOT focusedKey), so the
    // array reference stays stable as the user arrows through options — otherwise the
    // native <select> rebuilds its option list on each keystroke and loses keyboard focus.
    let optionList: { value: string; label: string | LocaleTextAccessor }[] =
        $derived([
            ...presets.map(([key, def]) => ({
                value: key,
                label: $locales.getName(def.names),
            })),
            {
                value: CUSTOM,
                label: (l: LocaleText) => l.ui.palette.sequence.preset.custom,
            },
        ]);

    // The poses bind is the first input of the Sequence structure.
    let posesBind = $derived(project.shares.output.Sequence.inputs[0]);
    let posesName = $derived($locales.getName(posesBind.names));

    // The Sequence Evaluates being edited.
    let sequenceEvaluates = $derived(outputs.map((output) => output.node));

    /** Read the poses argument of a Sequence Evaluate. */
    function getPoses(sequence: Evaluate): Expression | undefined {
        const arg = sequence.getInput(
            posesBind,
            project.getNodeContext(sequence),
        );
        return Array.isArray(arg) ? arg[0] : arg;
    }

    /** Which pre-defined sequence (or custom) a Sequence's poses represent. */
    function presetOf(sequence: Evaluate): string {
        const poses = getPoses(sequence);
        if (poses instanceof Evaluate) {
            const fun = poses.getFunction(project.getNodeContext(poses));
            const entry = presets.find(([, def]) => def === fun);
            if (entry) return entry[0];
        }
        // A map literal (or any unrecognized expression) counts as custom.
        return CUSTOM;
    }

    // The selected sequence across all outputs, or undefined when they disagree.
    let selected = $derived.by(() => {
        const all = sequenceEvaluates.map(presetOf);
        const first = all[0];
        return all.every((value) => value === first) ? first : undefined;
    });

    // The active preset definition (when a preset is selected), for parameters.
    let activeDef: FunctionDefinition | undefined = $derived(
        selected !== undefined && selected !== CUSTOM
            ? presets.find(([key]) => key === selected)?.[1]
            : undefined,
    );

    // Remember the most recent hand-written custom poses (in-memory, this editor only), so
    // switching to a preset and back restores the user's keyframes instead of a default map.
    let lastCustomPoses: MapLiteral | undefined = $state(undefined);
    $effect(() => {
        const evaluate = sequenceEvaluates[0];
        if (evaluate === undefined) return;
        const poses = getPoses(evaluate);
        if (poses instanceof MapLiteral) lastCustomPoses = poses;
    });

    // A preview of the currently-applied custom sequence (when one is selected), built by
    // evaluating its actual source so the hand-written keyframes/duration are shown.
    // Derive the source string first: it compares by value, so an unchanged custom sequence
    // keeps the same string (and thus the same preview object), avoiding restarting the
    // animation on every unrelated re-render — which would otherwise freeze it. Serialize
    // WITH the source's spacing — spacing lives in the Root, so a bare toWordplay() strips
    // it and collapses adjacent tokens (e.g. `🌈(50% 129 16°)` → `🌈(50%12916°)`), which
    // then fails to re-parse.
    let customSource = $derived.by(() => {
        if (selected !== CUSTOM) return undefined;
        const evaluate = sequenceEvaluates[0];
        if (evaluate === undefined) return undefined;
        return evaluate.toWordplay(project.getSourceOf(evaluate)?.spaces);
    });
    let customPreview = $derived(
        customSource === undefined
            ? undefined
            : buildSequencePreview($locales, customSource),
    );

    // The preset Evaluates (poses args that are preset calls), for editing parameters.
    let presetEvaluates = $derived(
        sequenceEvaluates
            .map(getPoses)
            .filter((poses): poses is Evaluate => poses instanceof Evaluate),
    );

    function revisePoses(value: Expression) {
        if ($projectStore === undefined) return;
        Projects.revise(
            $projectStore,
            $projectStore.getBindReplacements(
                sequenceEvaluates,
                posesName,
                value,
            ),
        );
    }

    function selectPreset(key: string) {
        const entry = presets.find(([k]) => k === key);
        if (entry === undefined) return;
        const [, def] = entry;
        revisePoses(
            Evaluate.make(Reference.make($locales.getName(def.names), def), []),
        );
    }

    function handleChange(value: string | undefined) {
        if (value === undefined) return;
        if (value === CUSTOM)
            // Restore the remembered custom poses if we have them, else a fresh default map.
            revisePoses(
                lastCustomPoses ?? createDefaultPosesMap(project, $locales),
            );
        else selectPreset(value);
    }

    // --- Parameters ---

    /** The unit string of a number-with-unit parameter, or '' if unitless. */
    function unitOf(input: Bind): string {
        const type = input.type;
        return type instanceof NumberType && type.unit instanceof Unit
            ? type.unit.toWordplay()
            : '';
    }

    /** Generic slider range keyed by unit; covers every built-in sequence parameter. */
    function rangeOf(unit: string): {
        min: number;
        max: number;
        step: number;
        precision: number;
    } {
        if (unit === '°') return { min: 0, max: 360, step: 1, precision: 0 };
        if (unit === 'm') return { min: 0, max: 5, step: 0.1, precision: 1 };
        if (unit === '') return { min: 0, max: 3, step: 0.1, precision: 1 };
        return { min: 0, max: 10, step: 0.1, precision: 1 };
    }

    function numberOf(expression: Expression | undefined): number | undefined {
        return expression instanceof NumberLiteral
            ? expression.getValue().toNumber()
            : undefined;
    }

    /** The current value of a parameter, falling back to the bind's default. */
    function paramValue(input: Bind): number | undefined {
        const evaluate = presetEvaluates[0];
        if (evaluate !== undefined) {
            const arg = evaluate.getInput(
                input,
                project.getNodeContext(evaluate),
            );
            const current = numberOf(Array.isArray(arg) ? arg[0] : arg);
            if (current !== undefined) return current;
        }
        return numberOf(input.value);
    }

    function changeParam(input: Bind, unit: string, value: Decimal) {
        if ($projectStore === undefined) return;
        Projects.revise(
            $projectStore,
            $projectStore.getBindReplacements(
                presetEvaluates,
                $locales.getName(input.names),
                parseNumber(toTokens(value.toString() + unit)),
            ),
        );
    }
</script>

<div class="preset" {id}>
    <Options
        label={(l) => l.ui.palette.sequence.preset.label}
        value={selected}
        width="8em"
        options={optionList}
        change={handleChange}
        focusoption={(value) => (focusedKey = value)}
        bluroption={(value) => {
            // Only clear if focus left this option without moving to another one;
            // otherwise a blur firing after the next option's focus would wrongly
            // stop the newly-focused option from animating.
            if (focusedKey === value) focusedKey = undefined;
        }}
        enteroption={(value) => (hoveredKey = value)}
        leaveoption={(value) => {
            if (hoveredKey === value) hoveredKey = undefined;
        }}
        {editable}
    >
        {#snippet item(option, localized)}
            <SequencePreview
                preview={option.value === CUSTOM
                    ? customPreview
                    : option.value === undefined
                      ? undefined
                      : previews.get(option.value)}
                active={option.value === focusedKey ||
                    option.value === hoveredKey}
            >
                {@render localized(option.label)}
            </SequencePreview>
        {/snippet}
        {#snippet selection()}
            <SequencePreview
                preview={selected === CUSTOM
                    ? customPreview
                    : selected !== undefined
                      ? previews.get(selected)
                      : undefined}
                active={true}
            >
                {#if selected === CUSTOM}<LocalizedText
                        path={(l) => l.ui.palette.sequence.preset.custom}
                    />{:else if activeDef}{$locales.getName(
                        activeDef.names,
                    )}{:else}&mdash;{/if}
            </SequencePreview>
        {/snippet}
    </Options>
    {#if activeDef}
        {#each activeDef.inputs as input (input)}
            {@const unit = unitOf(input)}
            {@const range = rangeOf(unit)}
            <div class="parameter">
                <label for={`parameter-${$locales.getName(input.names)}`}
                    >{$locales.getName(input.names)}</label
                >
                <Slider
                    id={`parameter-${$locales.getName(input.names)}`}
                    value={paramValue(input)}
                    min={range.min}
                    max={range.max}
                    {unit}
                    increment={range.step}
                    precision={range.precision}
                    tip={() => $locales.getName(input.names)}
                    start={() => selection?.setAdjusting(true)}
                    change={(value) => changeParam(input, unit, value)}
                    release={() => selection?.setAdjusting(false)}
                    {editable}
                />
            </div>
        {/each}
    {/if}
</div>

<style>
    .preset {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: 100%;
    }

    .parameter {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    label {
        font-style: italic;
        font-size: var(--wordplay-small-font-size);
        white-space: nowrap;
    }
</style>
