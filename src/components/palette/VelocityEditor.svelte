<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type Project from '@db/projects/Project';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import NumberValue from '@values/NumberValue';
    import { tick } from 'svelte';
    import { Projects } from '../../db/Database';
    import type Bind from '../../nodes/Bind';
    import type Evaluate from '../../nodes/Evaluate';
    import Expression from '../../nodes/Expression';
    import Note from '../widgets/Note.svelte';
    import TextField from '../widgets/TextField.svelte';
    import { getNumber } from './editOutput';

    interface Props {
        project: Project;
        velocity: Evaluate;
        editable: boolean;
    }

    let { project, velocity, editable }: Props = $props();

    let views: HTMLInputElement[] = $state([]);

    function valid(val: string) {
        const [num] = NumberValue.fromUnknown(val);
        return !num.isNaN();
    }

    async function handleChange(dimension: Bind, index: number, value: string) {
        if (velocity === undefined) return;
        if (value.length > 0 && !valid(value)) return;

        const focusIndex = views.findIndex(
            (view) => document.activeElement === view,
        );

        Projects.revise(project, [
            [
                velocity,
                velocity.withBindAs(
                    dimension,
                    NumberLiteral.make(
                        value.length === 0 ? 0 : value,
                        Unit.create([index < 2 ? 'm' : '°'], ['s']),
                    ),
                    project.getNodeContext(velocity),
                ),
            ],
        ]);

        if (focusIndex >= 0) {
            await tick();
            const view = views[focusIndex];
            if (view)
                setKeyboardFocus(
                    view,
                    'Restoring focus after velocity editor edit.',
                );
        }
    }
</script>

<div class="place">
    {project.shares.output.Velocity.names.getSymbolicName()}{#each project.shares.output.Velocity.inputs as dimension, index}
        {@const given = velocity?.getInput(
            dimension,
            project.getNodeContext(velocity),
        )}
        <!-- Get the measurement literal, if there is one -->
        {@const value =
            given instanceof Expression ? getNumber(given) : undefined}
        <div class="dimension">
            {#if value !== undefined}
                <TextField
                    id={`velocity-${index}`}
                    text={`${value}`}
                    validator={(text) =>
                        !valid(text) ? (l) => l.ui.palette.error.nan : true}
                    {editable}
                    placeholder={dimension.names.getNames()[0]}
                    description={(l) => l.ui.palette.field.coordinate}
                    changed={(value) => handleChange(dimension, index, value)}
                    bind:view={views[index]}
                />
                <Note
                    >{#if index < 2}m/s{:else}°/s{/if}</Note
                >
            {:else}
                <Note
                    ><LocalizedText
                        path={(locale) => locale.ui.palette.labels.computed}
                    /></Note
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
