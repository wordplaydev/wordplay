<script lang="ts">
    import { parseNumber } from '@parser/parseExpression';
    import Slider from '../widgets/Slider.svelte';
    import type OutputPropertyValues from '@edit/OutputPropertyValueSet';
    import type OutputPropertyRange from '@edit/OutputPropertyRange';
    import type OutputProperty from '@edit/OutputProperty';
    import { getProject } from '../project/Contexts';
    import { Projects } from '../../db/Database';
    import { getFirstName } from '../../locale/Locale';
    import { toTokens } from '../../parser/toTokens';
    import type Decimal from 'decimal.js';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;
    export let range: OutputPropertyRange;
    export let editable: boolean;

    const project = getProject();

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: Decimal) {
        if ($project === undefined) return;

        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                getFirstName(property.name.names),
                parseNumber(
                    toTokens(
                        newValue
                            .times(range.unit === '%' ? 100 : 1)
                            .toString() + range.unit
                    )
                )
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
    tip={getFirstName(property.name.names)}
    change={handleChange}
    precision={range.precision}
    {editable}
/>
