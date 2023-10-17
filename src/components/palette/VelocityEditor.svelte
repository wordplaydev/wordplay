<script lang="ts">
    import TextField from '../widgets/TextField.svelte';
    import type Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import NumberValue from '@values/NumberValue';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import Note from '../widgets/Note.svelte';
    import { getNumber } from './editOutput';
    import Expression from '../../nodes/Expression';
    import { Projects, locales } from '../../db/Database';
    import { tick } from 'svelte';
    import type Bind from '../../nodes/Bind';

    export let project: Project;
    export let velocity: Evaluate;
    export let editable: boolean;

    let views: HTMLInputElement[] = [];

    function valid(val: string) {
        const [num] = NumberValue.fromUnknown(val, false);
        return !num.isNaN();
    }

    async function handleChange(dimension: Bind, index: number, value: string) {
        if (velocity === undefined) return;
        if (value.length > 0 && !valid(value)) return;

        const focusIndex = views.findIndex(
            (view) => document.activeElement === view
        );

        Projects.revise(project, [
            [
                velocity,
                velocity.withBindAs(
                    dimension,
                    NumberLiteral.make(
                        value.length === 0 ? 0 : value,
                        Unit.create([index < 2 ? 'm' : '°'], ['s'])
                    ),
                    project.getNodeContext(velocity)
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
    {project.shares.output.Velocity.names.getSymbolicName()}{#each project.shares.output.Velocity.inputs as dimension, index}
        {@const given = velocity?.getInput(
            dimension,
            project.getNodeContext(velocity)
        )}
        <!-- Get the measurement literal, if there is one -->
        {@const value =
            given instanceof Expression ? getNumber(given) : undefined}
        <div class="dimension">
            {#if value !== undefined}
                <TextField
                    text={`${value}`}
                    validator={valid}
                    {editable}
                    placeholder={dimension.names.getNames()[0]}
                    description={$locales.get(
                        (l) => l.ui.palette.field.coordinate
                    )}
                    changed={(value) => handleChange(dimension, index, value)}
                    bind:view={views[index]}
                />
                <Note
                    >{#if index < 2}m/s{:else}°/s{/if}</Note
                >
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
