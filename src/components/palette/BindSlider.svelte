<script lang="ts">
    import { project, reviseProject } from '../../models/stores';
    import { parseMeasurement, toTokens } from '@parser/Parser';
    import Slider from '../widgets/Slider.svelte';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type {
        OutputProperty,
        OutputPropertyRange,
    } from '@transforms/OutputExpression';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let range: OutputPropertyRange;

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: number) {
        if ($project === undefined) return;

        reviseProject(
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                parseMeasurement(toTokens(newValue + range.unit))
            )
        );
    }
</script>

<Slider
    value={values.getNumber()}
    min={range.min}
    max={range.max}
    unit={range.unit}
    increment={range.step}
    change={handleChange}
    isDefault={values.isDefault()}
/>
