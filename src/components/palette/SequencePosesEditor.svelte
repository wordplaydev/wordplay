<script lang="ts">
    import KeyValue from '@nodes/KeyValue';
    import TextField from '../widgets/TextField.svelte';
    import PoseEditor from './PoseEditor.svelte';
    import type Project from '@models/Project';
    import MapLiteral from '@nodes/MapLiteral';
    import NumberLiteral from '@nodes/NumberLiteral';
    import { createPoseLiteral } from '@output/Pose';
    import Evaluate from '@nodes/Evaluate';
    import OutputExpression from '@edit/OutputExpression';
    import Unit from '@nodes/Unit';
    import type Expression from '@nodes/Expression';
    import Button from '../widgets/Button.svelte';
    import Note from '../widgets/Note.svelte';
    import { DB, locale, locales } from '../../db/Database';

    export let project: Project;
    export let map: MapLiteral | undefined;

    // Get the map from the value set, unless its not a valid sequence or the maps of the selections aren't equal.
    $: valid =
        map !== undefined &&
        map.values.every(
            (kv) =>
                kv instanceof KeyValue &&
                kv.key instanceof NumberLiteral &&
                kv.value instanceof Evaluate &&
                kv.value.is(
                    project.shares.output.Pose,
                    project.getNodeContext(kv.value)
                )
        );

    function revisePercent(kv: KeyValue | Expression, percent: string) {
        let text = percent.replace('%', '');
        const number = NumberLiteral.make(text, Unit.create(['%']));
        if (kv instanceof KeyValue && number.isInteger())
            DB.reviseProjectNodes(project, [[kv.key, number]]);
    }

    function addPose(index: number) {
        if (map === undefined) return;
        const kv = map.values[index];
        revise([
            ...map.values.slice(0, index + 1),
            KeyValue.make(
                NumberLiteral.make(
                    kv instanceof KeyValue && kv.key instanceof NumberLiteral
                        ? kv.key.number.getText().replace('%', '')
                        : 0
                ),
                createPoseLiteral(project, $locales)
            ),
            ...map.values.slice(index + 1),
        ] as KeyValue[]);
    }

    function removePose(index: number) {
        if (map === undefined) return;
        revise([
            ...map.values.slice(0, index),
            ...map.values.slice(index + 1),
        ] as KeyValue[]);
    }
    function movePose(index: number, direction: 1 | -1) {
        if (map === undefined) return;
        const kv = map.values[index] as KeyValue;
        if (kv === undefined) return;
        const newValues = map.values.slice() as KeyValue[];
        if (direction < 0) {
            const previous = newValues[index - 1];
            newValues[index - 1] = kv;
            newValues[index] = previous;
        } else {
            const next = newValues[index + 1];
            newValues[index + 1] = kv;
            newValues[index] = next;
        }
        revise(newValues);
    }

    function revise(newValues: KeyValue[]) {
        if (map)
            DB.reviseProjectNodes(project, [[map, MapLiteral.make(newValues)]]);
    }
</script>

<div class="pairs">
    {#if map && valid}
        {#each map.values as pair, index}
            {#if pair instanceof KeyValue && pair.value instanceof Evaluate}
                <div class="pair">
                    <div class="percent"
                        ><TextField
                            text={pair.key.toWordplay()}
                            description={$locale.ui.description
                                .editSequencePercent}
                            placeholder={$locale.ui.placeholders.percent}
                            validator={(value) => {
                                const number = parseInt(value.replace('%', ''));
                                if (isNaN(number)) return false;
                                if (number < 0 || number > 100) return false;
                                const previous = map?.values[index - 1];
                                const next = map?.values[index + 1];
                                if (
                                    previous &&
                                    previous instanceof KeyValue &&
                                    previous.key instanceof NumberLiteral &&
                                    number / 100 <
                                        previous.key.getValue().num.toNumber()
                                )
                                    return false;
                                if (
                                    next &&
                                    next instanceof KeyValue &&
                                    next.key instanceof NumberLiteral &&
                                    number / 100 >
                                        next.key.getValue().num.toNumber()
                                )
                                    return false;

                                return true;
                            }}
                            changed={(value) => revisePercent(pair, value)}
                        />
                        <Button
                            tip={$locale.ui.description.addPose}
                            action={() => addPose(index)}>+</Button
                        >
                        <Button
                            tip={$locale.ui.description.removePose}
                            action={() => removePose(index)}
                            active={map !== undefined && map.values.length > 1}
                            >⨉</Button
                        >
                        <Button
                            tip={$locale.ui.description.movePoseUp}
                            action={() => movePose(index, -1)}
                            active={index > 0}>↑</Button
                        >
                        <Button
                            tip={$locale.ui.description.movePoseDown}
                            action={() => movePose(index, 1)}
                            active={index < map.values.length - 1}>↓</Button
                        >
                    </div>
                    <div class="pose"
                        ><PoseEditor
                            {project}
                            outputs={[
                                new OutputExpression(project, pair.value),
                            ]}
                            sequence
                        /></div
                    >
                </div>
            {/if}
        {/each}
    {:else}
        <Note>{$locale.ui.labels.notSequence}</Note>
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
