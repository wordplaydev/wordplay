<script lang="ts">
    import type OutputProperty from '@edit/output/OutputProperty';
    import type OutputPropertyRange from '@edit/output/OutputPropertyRange';
    import type OutputPropertyValues from '@edit/output/OutputPropertyValueSet';
    import { parseNumber } from '@parser/parseExpression';
    import type Decimal from 'decimal.js';
    import { locales, Projects } from '../../db/Database';
    import { toTokens } from '../../parser/toTokens';
    import { getProject } from '../project/Contexts';
    import Slider from '../widgets/Slider.svelte';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        range: OutputPropertyRange;
        editable: boolean;
        id?: string | undefined;
    }

    let { property, values, range, editable, id = undefined }: Props = $props();

    const project = getProject();

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: Decimal) {
        if ($project === undefined) return;

        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName($locales),
                parseNumber(
                    toTokens(
                        newValue
                            .times(range.unit === '%' ? 100 : 1)
                            .toString() + range.unit,
                    ),
                ),
            ),
        );
    }
</script>

<Slider
    value={values.getNumber()}
    min={range.min}
    max={range.max}
    unit={range.unit}
    increment={range.step}
    tip={property.name}
    change={handleChange}
    precision={range.precision}
    {editable}
    {id}
/>
