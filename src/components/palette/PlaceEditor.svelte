<script lang="ts">
    import TextField from '../widgets/TextField.svelte';
    import Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import NumberValue from '@values/NumberValue';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import Note from '../widgets/Note.svelte';
    import { getNumber } from './editOutput';
    import Expression from '../../nodes/Expression';
    import { Projects, locales } from '../../db/Database';
    import { tick } from 'svelte';
    import Button from '../widgets/Button.svelte';
    import type Bind from '../../nodes/Bind';
    import NumberType from '../../nodes/NumberType';

    export let project: Project;
    export let place: Evaluate;
    export let editable: boolean;
    export let convertable: boolean;

    let views: HTMLInputElement[] = [];

    function valid(val: string) {
        const [num] = NumberValue.fromUnknown(val, false);
        return !num.isNaN();
    }

    async function handleChange(dimension: Bind, value: string) {
        if (place === undefined) return;
        if (value.length > 0 && !valid(value)) return;

        const focusIndex = views.findIndex(
            (view) => document.activeElement === view
        );

        Projects.revise(project, [
            [
                place,
                place.withBindAs(
                    dimension,
                    NumberLiteral.make(
                        value.length === 0 ? 0 : value,
                        getUnit(dimension)
                    ),
                    project.getNodeContext(place)
                ),
            ],
        ]);

        if (focusIndex >= 0) {
            await tick();
            const view = views[focusIndex];
            view?.focus();
        }
    }

    function getUnit(bind: Bind) {
        const types =
            bind.type === undefined
                ? []
                : bind.type.getPossibleTypes(project.getNodeContext(place));
        const unit = types.find(
            (type): type is NumberType => type instanceof NumberType
        )?.unit;
        return unit instanceof Unit ? unit.clone() : undefined;
    }
</script>

{project.shares.output.Place.names.getSymbolicName()}
<div class="place">
    {#each project.shares.output.Place.inputs as dimension, index}
        {@const given = place?.getInput(
            dimension,
            project.getNodeContext(place)
        )}
        <!-- Get the measurement literal, if there is one -->
        {@const value =
            given instanceof Expression ? getNumber(given) : undefined}
        <div class="dimension">
            {#if value !== undefined || given == undefined}
                <TextField
                    text={`${value ?? 0}`}
                    validator={valid}
                    {editable}
                    placeholder={dimension.names.getNames()[0]}
                    description={$locales.get(
                        (l) => l.ui.palette.field.coordinate
                    )}
                    changed={(value) => handleChange(dimension, value)}
                    bind:view={views[index]}
                />
                <Note>{getUnit(dimension)?.toWordplay() ?? ''}</Note>
            {:else}
                <Note
                    >{$locales.get(
                        (locale) => locale.ui.palette.labels.computed
                    )}</Note
                >
            {/if}
        </div>
    {/each}
</div>
{#if convertable}
    <Button
        tip={$locales.get((l) => l.ui.palette.button.addMotion)}
        active={editable}
        action={() =>
            Projects.revise(project, [
                [
                    place,
                    Evaluate.make(
                        project.shares.input.Motion.getReference($locales),
                        [
                            place,
                            Evaluate.make(
                                project.shares.output.Velocity.getReference(
                                    $locales
                                ),
                                [
                                    NumberLiteral.make(
                                        0,
                                        Unit.create(['m'], ['s'])
                                    ),
                                    NumberLiteral.make(
                                        0,
                                        Unit.create(['m'], ['s'])
                                    ),
                                    NumberLiteral.make(
                                        0,
                                        Unit.create(['°'], ['s'])
                                    ),
                                ]
                            ),
                        ]
                    ),
                ],
            ])}>→{project.shares.input.Motion.getNames()[0]}</Button
    >
    <Button
        tip={$locales.get((l) => l.ui.palette.button.addPlacement)}
        active={editable}
        action={() =>
            Projects.revise(project, [
                [
                    place,
                    Evaluate.make(
                        project.shares.input.Placement.getReference($locales),
                        [place]
                    ),
                ],
            ])}>→{project.shares.input.Placement.getNames()[0]}</Button
    >
{/if}

<style>
    .place {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .dimension {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        width: 5em;
    }
</style>
