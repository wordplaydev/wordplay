<script lang="ts">
    import { preferredTranslations } from '@translation/translations';
    import { getFirstName } from '@translation/Translation';
    import TextField from '../widgets/TextField.svelte';
    import type Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import Measurement from '@runtime/Measurement';
    import MeasurementLiteral from '@nodes/MeasurementLiteral';
    import Unit from '@nodes/Unit';
    import Note from '../widgets/Note.svelte';
    import Bind from '../../nodes/Bind';
    import { getProject, getSelectedOutput } from '../project/Contexts';
    import { reviseProject } from '../project/project';

    export let project: Project;
    export let place: Evaluate | undefined;

    let projectStore = getProject();
    let selectedOutput = getSelectedOutput();

    function valid(val: string) {
        return !Measurement.fromUnknown(val).isNaN();
    }

    function handleChange(dimension: string, value: string) {
        if (place === undefined || selectedOutput === undefined) return;
        if (value.length > 0 && !valid(value)) return;

        reviseProject(projectStore, selectedOutput, [
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
    {#each [getFirstName($preferredTranslations[0].output.place.x.name), getFirstName($preferredTranslations[0].output.place.y.name), getFirstName($preferredTranslations[0].output.place.z.name)] as dimension}
        {@const given = place?.getMappingFor(
            dimension,
            project.getNodeContext(place)
        )?.given}
        {@const measurement =
            given instanceof MeasurementLiteral
                ? given
                : given instanceof Bind &&
                  given.value instanceof MeasurementLiteral
                ? given.value
                : undefined}
        {@const value = measurement
            ? measurement.getValue().num.toNumber()
            : undefined}
        <div class="dimension">
            {#if measurement !== undefined || given === undefined}
                <TextField
                    text={`${value ?? ''}`}
                    validator={valid}
                    placeholder={getFirstName(dimension)}
                    changed={(value) => handleChange(dimension, value)}
                />
                <Note>m</Note>
            {:else}
                <Note
                    >{$preferredTranslations.map(
                        (t) => t.ui.labels.computed
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
