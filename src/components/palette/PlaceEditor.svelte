<script lang="ts">
    import { getFirstName } from '@locale/Locale';
    import TextField from '../widgets/TextField.svelte';
    import type Evaluate from '../../nodes/Evaluate';
    import type Project from '@models/Project';
    import Number from '@runtime/Number';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import Note from '../widgets/Note.svelte';
    import { getNumber } from './editOutput';
    import Expression from '../../nodes/Expression';
    import { config } from '../../db/Creator';

    export let project: Project;
    export let place: Evaluate | undefined;

    function valid(val: string) {
        return !Number.fromUnknown(val).isNaN();
    }

    function handleChange(dimension: string, value: string) {
        if (place === undefined) return;
        if (value.length > 0 && !valid(value)) return;

        $config.reviseProjectNodes(project, [
            [
                place,
                place.withBindAs(
                    dimension,
                    value.length === 0
                        ? undefined
                        : NumberLiteral.make(value, Unit.make(['m'])),
                    project.getNodeContext(place)
                ),
            ],
        ]);
    }
</script>

<div class="place">
    {#each [getFirstName($config.getLocale().output.Place.x.names), getFirstName($config.getLocale().output.Place.y.names), getFirstName($config.getLocale().output.Place.z.names)] as dimension}
        {@const given = place?.getMappingFor(
            dimension,
            project.getNodeContext(place)
        )?.given}
        <!-- Get the measurement literal, if there is one -->
        {@const value =
            given instanceof Expression ? getNumber(given) : undefined}
        <div class="dimension">
            {#if value}
                <TextField
                    text={`${value}`}
                    validator={valid}
                    placeholder={getFirstName(dimension)}
                    description={$config.getLocale().ui.description
                        .editCoordinate}
                    changed={(value) => handleChange(dimension, value)}
                />
                <Note>m</Note>
            {:else}
                <Note
                    >{$config
                        .getLocales()
                        .map((locale) => locale.ui.labels.computed)}</Note
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
