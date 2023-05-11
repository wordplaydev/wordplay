<script lang="ts">
    import { preferredLocales } from '@translation/locales';
    import { getFirstName } from '@translation/Locale';
    import TextField from '../widgets/TextField.svelte';
    import type Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import Measurement from '@runtime/Measurement';
    import MeasurementLiteral from '@nodes/MeasurementLiteral';
    import Unit from '@nodes/Unit';
    import Note from '../widgets/Note.svelte';
    import { getProjects } from '../project/Contexts';
    import { getMeasurement } from './editOutput';
    import Expression from '../../nodes/Expression';

    export let project: Project;
    export let place: Evaluate | undefined;

    const projects = getProjects();

    function valid(val: string) {
        return !Measurement.fromUnknown(val).isNaN();
    }

    function handleChange(dimension: string, value: string) {
        if (place === undefined) return;
        if (value.length > 0 && !valid(value)) return;

        $projects.reviseNodes(project, [
            [
                place,
                place.withBindAs(
                    dimension,
                    value.length === 0
                        ? undefined
                        : MeasurementLiteral.make(value, Unit.make(['m'])),
                    project.getNodeContext(place)
                ),
            ],
        ]);
    }
</script>

<div class="place">
    {#each [getFirstName($preferredLocales[0].output.place.x.names), getFirstName($preferredLocales[0].output.place.y.names), getFirstName($preferredLocales[0].output.place.z.names)] as dimension}
        {@const given = place?.getMappingFor(
            dimension,
            project.getNodeContext(place)
        )?.given}
        <!-- Get the measurement literal, if there is one -->
        {@const value =
            given instanceof Expression ? getMeasurement(given) : undefined}
        <div class="dimension">
            {#if value}
                <TextField
                    text={`${value}`}
                    validator={valid}
                    placeholder={getFirstName(dimension)}
                    changed={(value) => handleChange(dimension, value)}
                />
                <Note>m</Note>
            {:else}
                <Note>{$preferredLocales.map((t) => t.ui.labels.computed)}</Note
                >
            {/if}
        </div>
    {/each}
</div>

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
        flex-wrap: no;
        align-items: baseline;
        width: 5em;
    }
</style>
