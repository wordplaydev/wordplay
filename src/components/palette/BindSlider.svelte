<script lang="ts">
    import { parseMeasurement, toTokens } from '@parser/Parser';
    import Slider from '../widgets/Slider.svelte';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import type OutputPropertyRange from '@transforms/OutputPropertyRange';
    import type OutputProperty from '@transforms/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { creator } from '../../db/Creator';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let range: OutputPropertyRange;

    const project = getProject();

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: number) {
        if ($project === undefined) return;

        $creator.reviseProjectNodes(
            $project,
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
    precision={range.precision}
/>
