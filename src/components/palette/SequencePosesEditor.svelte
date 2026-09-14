<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import type Project from '@db/projects/Project';
    import OutputExpression from '@edit/output/OutputExpression';
    import Evaluate from '@nodes/Evaluate';
    import type Expression from '@nodes/Expression';
    import KeyValue from '@nodes/KeyValue';
    import MapLiteral from '@nodes/MapLiteral';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import { createPoseLiteral } from '@output/animation/Pose';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import Button from '@components/widgets/Button.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import PoseEditor from '@components/palette/PoseEditor.svelte';

    interface Props {
        project: Project;
        map: MapLiteral | undefined;
        editable: boolean;
        id?: string | undefined;
    }

    let { project, map, editable, id = undefined }: Props = $props();

    // Get the map from the value set, unless its not a valid sequence or the maps of the selections aren't equal.
    let valid = $derived(
        map !== undefined &&
            map.values.every(
                (kv) =>
                    kv instanceof KeyValue &&
                    kv.key instanceof NumberLiteral &&
                    kv.value instanceof Evaluate &&
                    kv.value.is(
                        project.shares.output.Pose,
                        project.getNodeContext(kv.value),
                    ),
            ),
    );

    function revisePercent(kv: KeyValue | Expression, percent: string) {
        let text = percent.replace('%', '');
        const number = NumberLiteral.make(text, Unit.create(['%']));
        if (kv instanceof KeyValue && number.isInteger())
            Projects.revise(project, [[kv.key, number]]);
    }

    function addPose(index: number) {
        const entries = poseEntries();
        if (entries === undefined) return;
        const kv = entries[index];
        revise([
            ...entries.slice(0, index + 1),
            KeyValue.make(
                NumberLiteral.make(
                    kv?.key instanceof NumberLiteral
                        ? kv.key.number.getText().replace('%', '')
                        : 0,
                ),
                createPoseLiteral(project, $locales),
            ),
            ...entries.slice(index + 1),
        ]);
    }

    /** The map's entries, when every value is a key/value pair. A map holding
     *  a bare expression (a spread, a reference) isn't one this editor can
     *  rewrite entry by entry, so it edits nothing rather than corrupting it. */
    function poseEntries(): KeyValue[] | undefined {
        if (map === undefined) return undefined;
        const entries = map.values.filter(
            (value): value is KeyValue => value instanceof KeyValue,
        );
        return entries.length === map.values.length ? entries : undefined;
    }

    function removePose(index: number) {
        const entries = poseEntries();
        if (entries === undefined) return;
        revise([...entries.slice(0, index), ...entries.slice(index + 1)]);
    }
    function movePose(index: number, direction: 1 | -1) {
        const entries = poseEntries();
        if (entries === undefined) return;
        const kv = entries[index];
        if (kv === undefined) return;
        const newValues = entries.slice();
        // Nothing to swap with at either end; the move buttons are inactive there.
        const other = newValues[index + direction];
        if (other === undefined) return;
        newValues[index + direction] = kv;
        newValues[index] = other;
        revise(newValues);
    }

    function revise(newValues: KeyValue[]) {
        if (map) Projects.revise(project, [[map, MapLiteral.make(newValues)]]);
    }
</script>

<div class="pairs" {id}>
    {#if map && valid}
        {#each map.values as pair, index}
            {#if pair instanceof KeyValue && pair.value instanceof Evaluate}
                <div class="pair">
                    <div class="percent"
                        ><TextField
                            id="percent-editor-{id}-{index}"
                            text={pair.key.toWordplay()}
                            description={(l) =>
                                l.ui.palette.sequence.field.percent}
                            placeholder={(l) =>
                                l.ui.palette.sequence.field.percent}
                            validator={(value) => {
                                const number = parseInt(value.replace('%', ''));
                                if (isNaN(number))
                                    return (l) => l.ui.palette.error.nan;
                                if (number < 0 || number > 100)
                                    return (l) => l.ui.palette.error.percent;
                                const previous = map?.values[index - 1];
                                const next = map?.values[index + 1];
                                if (
                                    previous &&
                                    previous instanceof KeyValue &&
                                    previous.key instanceof NumberLiteral &&
                                    number <
                                        previous.key.getValue().num.toNumber()
                                )
                                    return (l) =>
                                        l.ui.palette.error.moreThanPrevious;
                                if (
                                    next &&
                                    next instanceof KeyValue &&
                                    next.key instanceof NumberLiteral &&
                                    number > next.key.getValue().num.toNumber()
                                )
                                    return (l) =>
                                        l.ui.palette.error.lessThanNext;

                                return true;
                            }}
                            changed={(value) => revisePercent(pair, value)}
                            {editable}
                        />
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.add}
                            active={editable}
                            action={() => addPose(index)}
                            icon="+"
                        ></Button>
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.remove}
                            action={() => removePose(index)}
                            active={editable &&
                                map !== undefined &&
                                map.values.length > 1}
                            icon={CANCEL_SYMBOL}
                        ></Button>
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.up}
                            action={() => movePose(index, -1)}
                            active={editable && index > 0}
                            icon="↑"
                        ></Button>
                        <Button
                            tip={(l) => l.ui.palette.sequence.button.down}
                            action={() => movePose(index, 1)}
                            active={editable && index < map.values.length - 1}
                            icon="↓"
                        ></Button>
                    </div>
                    <div class="pose"
                        ><PoseEditor
                            {project}
                            outputs={[
                                new OutputExpression(
                                    project,
                                    pair.value,
                                    $locales,
                                ),
                            ]}
                            sequence
                            {editable}
                        /></div
                    >
                </div>
            {/if}
        {/each}
    {:else}
        <Note
            ><LocalizedText
                path={(l) => l.ui.palette.labels.notSequence}
            /></Note
        >
    {/if}
</div>

<style>
    .pairs {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
    }

    .pair {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .percent {
        width: 3em;
    }
</style>
