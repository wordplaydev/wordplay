<script lang="ts">
    import { project, reviseProject } from '../../models/stores';
    import Dimension from '@nodes/Dimension';
    import Evaluate from '@nodes/Evaluate';
    import MeasurementLiteral from '@nodes/MeasurementLiteral';
    import Reference from '@nodes/Reference';
    import Unit from '@nodes/Unit';
    import { ColorType } from '@output/Color';
    import type { OutputProperty } from '@transforms/OutputExpression';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';
    import ColorChooser from '../widgets/ColorChooser.svelte';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;

    $: lightness = getColorValue('lightness') ?? 0;
    $: chroma = getColorValue('chroma') ?? 0;
    $: hue = getColorValue('hue') ?? 0;

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(l: number, c: number, h: number) {
        if ($project === undefined) return;

        // Make a Color evaluation corresponding to the new value
        const replacement = Evaluate.make(
            Reference.make(ColorType.names.getNames()[0], ColorType),
            [
                MeasurementLiteral.make(l + '%'),
                MeasurementLiteral.make(c),
                MeasurementLiteral.make(
                    h,
                    new Unit(undefined, [Dimension.make(false, '°', 1)])
                ),
            ]
        );

        reviseProject(
            $project.getBindReplacements(
                values.getExpressions(),
                property.name,
                replacement
            )
        );
    }

    function getColorValue(name: string) {
        if ($project === undefined) return undefined;
        // The value of this facet on every value selected.
        const facets = values.values.map((val) => {
            if ($project && val.expression instanceof Evaluate) {
                const mapping = val.expression.getMappingFor(
                    name,
                    $project.getNodeContext(val.expression)
                );
                const number =
                    mapping && mapping.given instanceof MeasurementLiteral
                        ? mapping.given.getValue().toNumber() *
                          (name === 'lightness' ? 100 : 1)
                        : undefined;
                return number;
            }
        });
        // If they're all equal, return the value.
        return new Set(facets).size === 1 ? facets[0] : undefined;
    }
</script>

<ColorChooser {lightness} {chroma} {hue} change={handleChange} />
