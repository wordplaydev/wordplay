<script lang="ts">
    import type OutputProperty from '#edit/output/OutputProperty.ts';
    import type OutputPropertyRange from '#edit/output/OutputPropertyRange.ts';
    import type OutputPropertyValues from '#edit/output/OutputPropertyValueSet.ts';
    import { getFirstText } from '#locale/LocaleText.ts';
    import { parseNumber } from '#parser/parseExpression.ts';
    import type Decimal from 'decimal.js';
    import { locales } from '#db/Database.ts';
    import { Projects } from '#db/projects/Projects.ts';
    import { toTokens } from '#parser/toTokens.ts';
    import {
        getProject,
        getSelectedOutput,
    } from '#components/project/Contexts.ts';
    import Slider from '#components/widgets/Slider.svelte';
    import { must } from '#util/nullable.ts';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValues;
        range: OutputPropertyRange;
        editable: boolean;
        id?: string | undefined;
    }

    let { property, values, range, editable, id = undefined }: Props = $props();

    const project = getProject();
    const selection = getSelectedOutput();

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: Decimal) {
        if ($project === undefined) return;

        Projects.revise(
            $project,
            values.getEditReplacements(
                $project,
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
    tip={() =>
        must(
            getFirstText($locales.getTextStructure(property.name)),
            "the property's name",
        )}
    start={() => selection?.setAdjusting(true)}
    change={handleChange}
    release={() => selection?.setAdjusting(false)}
    precision={range.precision}
    {editable}
    {id}
/>
