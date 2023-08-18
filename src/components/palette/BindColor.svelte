<script lang="ts">
    import Dimension from '@nodes/Dimension';
    import Evaluate from '@nodes/Evaluate';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Reference from '@nodes/Reference';
    import Unit from '@nodes/Unit';
    import type OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import ColorChooser from '../widgets/ColorChooser.svelte';
    import type OutputProperty from '../../edit/OutputProperty';
    import { getProject, getSelectedOutput } from '../project/Contexts';
    import { DB } from '../../db/Database';

    export let property: OutputProperty;
    export let values: OutputPropertyValueSet;

    let project = getProject();
    let selectedOutput = getSelectedOutput();

    $: lightness = getColorValue('lightness') ?? 0;
    $: chroma = getColorValue('chroma') ?? 0;
    $: hue = getColorValue('hue') ?? 0;

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(l: number, c: number, h: number) {
        if ($project === undefined || selectedOutput === undefined) return;

        // Make a Color evaluation corresponding to the new value
        const replacement = Evaluate.make(
            Reference.make(
                $project.shares.output.Color.names.getNames()[0],
                $project.shares.output.Color
            ),
            [
                NumberLiteral.make(l + '%'),
                NumberLiteral.make(c),
                NumberLiteral.make(
                    h,
                    new Unit(undefined, [Dimension.make(false, '°', 1)])
                ),
            ]
        );

        DB.reviseProjectNodes(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
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
                    mapping && mapping.given instanceof NumberLiteral
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
