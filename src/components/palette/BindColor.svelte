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
    import { Projects } from '../../db/Database';
    import type Bind from '../../nodes/Bind';

    export let property: OutputProperty;
    export let values: OutputPropertyValueSet;
    export let editable: boolean;

    let project = getProject();
    let selectedOutput = getSelectedOutput();

    $: lightness = $project
        ? getColorValue($project.shares.output.Color.inputs[0], values) ?? 0
        : 0;
    $: chroma = $project
        ? getColorValue($project.shares.output.Color.inputs[1], values) ?? 0
        : 0;
    $: hue = $project
        ? getColorValue($project.shares.output.Color.inputs[2], values) ?? 0
        : 0;

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
                NumberLiteral.make(Math.round(l * 100) + '%'),
                NumberLiteral.make(c),
                NumberLiteral.make(
                    h,
                    new Unit(undefined, [Dimension.make(false, '°', 1)])
                ),
            ]
        );

        lightness = l;
        chroma = c;
        hue = h;

        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
                replacement
            )
        );
    }

    function getColorValue(bind: Bind, vals: OutputPropertyValueSet) {
        if ($project === undefined) return undefined;
        // The value of this facet on every value selected.
        const facets = vals.values.map((val) => {
            if ($project && val.expression instanceof Evaluate) {
                const mapping = val.expression.getMappingFor(
                    bind,
                    $project.getNodeContext(val.expression)
                );
                const number =
                    mapping && mapping.given instanceof NumberLiteral
                        ? mapping.given.getValue().toNumber()
                        : undefined;
                return number;
            }
        });
        // If they're all equal, return the value.
        return new Set(facets).size === 1 ? facets[0] : undefined;
    }
</script>

<ColorChooser {lightness} {chroma} {hue} change={handleChange} {editable} />
