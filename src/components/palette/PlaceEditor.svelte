<script lang="ts">
    import { getFirstName } from '@locale/Locale';
    import TextField from '../widgets/TextField.svelte';
    import Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import NumberValue from '@values/NumberValue';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import Note from '../widgets/Note.svelte';
    import { getNumber } from './editOutput';
    import Expression from '../../nodes/Expression';
    import { Projects, locale, locales } from '../../db/Database';
    import { tick } from 'svelte';
    import Button from '../widgets/Button.svelte';

    export let project: Project;
    export let place: Evaluate;
    export let editable: boolean;
    export let convertable: boolean;

    let views: HTMLInputElement[] = [];

    function valid(val: string) {
        return !NumberValue.fromUnknown(val).isNaN();
    }

    async function handleChange(dimension: string, value: string) {
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
                        Unit.create(['m'])
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
</script>

<div class="place">
    {project.shares.output.Place.names.getSymbolicName()}{#each [getFirstName($locale.output.Place.x.names), getFirstName($locale.output.Place.y.names), getFirstName($locale.output.Place.z.names)] as dimension, index}
        {@const given = place?.getMappingFor(
            dimension,
            project.getNodeContext(place)
        )?.given}
        <!-- Get the measurement literal, if there is one -->
        {@const value =
            given instanceof Expression ? getNumber(given) : undefined}
        <div class="dimension">
            {#if value !== undefined}
                <TextField
                    text={`${value}`}
                    validator={valid}
                    {editable}
                    placeholder={getFirstName(dimension)}
                    description={$locale.ui.palette.field.coordinate}
                    changed={(value) => handleChange(dimension, value)}
                    bind:view={views[index]}
                />
                <Note>m</Note>
            {:else}
                <Note
                    >{$locales.map(
                        (locale) => locale.ui.palette.labels.computed
                    )}</Note
                >
            {/if}
        </div>
    {/each}
</div>
{#if convertable}
    <Button
        tip={$locale.ui.palette.button.addMotion}
        active={editable}
        action={() =>
            Projects.revise(project, [
                [
                    place,
                    Evaluate.make(
                        project.shares.input.Motion.getReference(
                            project.locales
                        ),
                        [
                            place,
                            Evaluate.make(
                                project.shares.output.Velocity.getReference(
                                    project.locales
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
        tip={$locale.ui.palette.button.addPlacement}
        active={editable}
        action={() =>
            Projects.revise(project, [
                [
                    place,
                    Evaluate.make(
                        project.shares.input.Placement.getReference(
                            project.locales
                        ),
                        []
                    ),
                ],
            ])}>→{project.shares.input.Placement.getNames()[0]}</Button
    >
{/if}

<style>
    .place {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .dimension {
        display: flex;
        flex-direction: row;
        flex-wrap: no;
        align-items: baseline;
        width: 5em;
    }
</style>
