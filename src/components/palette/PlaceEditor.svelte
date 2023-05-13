<script lang="ts">
    import { getFirstName } from '@locale/Locale';
    import TextField from '../widgets/TextField.svelte';
    import type Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import Measurement from '@runtime/Measurement';
    import MeasurementLiteral from '@nodes/MeasurementLiteral';
    import Unit from '@nodes/Unit';
    import Note from '../widgets/Note.svelte';
    import { getMeasurement } from './editOutput';
    import Expression from '../../nodes/Expression';
    import { creator } from '../../db/Creator';

    export let project: Project;
    export let place: Evaluate | undefined;

    function valid(val: string) {
        return !Measurement.fromUnknown(val).isNaN();
    }

    function handleChange(dimension: string, value: string) {
        if (place === undefined) return;
        if (value.length > 0 && !valid(value)) return;

        $creator.reviseProjectNodes(project, [
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
    {#each [getFirstName($creator.getLocale().output.place.x.names), getFirstName($creator.getLocale().output.place.y.names), getFirstName($creator.getLocale().output.place.z.names)] as dimension}
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
                <Note
                    >{$creator
                        .getLocales()
                        .map((t) => t.ui.labels.computed)}</Note
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
