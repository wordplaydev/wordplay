<script lang="ts">
    import type OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import Dimension from '@nodes/Dimension';
    import Evaluate from '@nodes/Evaluate';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Reference from '@nodes/Reference';
    import Unit from '@nodes/Unit';
    import { locales, Projects } from '../../db/Database';
    import type OutputProperty from '../../edit/OutputProperty';
    import type Bind from '../../nodes/Bind';
    import { getProject, getSelectedOutput } from '../project/Contexts';
    import ColorChooser from '../widgets/ColorChooser.svelte';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValueSet;
        editable: boolean;
        id?: string | undefined;
    }

    let { property, values, editable, id = undefined }: Props = $props();

    let project = getProject();
    let selection = getSelectedOutput();

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(l: number, c: number, h: number) {
        if (
            $project === undefined ||
            (selection !== undefined && !selection.hasPaths())
        )
            return;

        // Make a Color evaluation corresponding to the new value
        const replacement = Evaluate.make(
            Reference.make(
                $project.shares.output.Color.names.getNames()[0],
                $project.shares.output.Color,
            ),
            [
                NumberLiteral.make(Math.round(l * 100) + '%'),
                NumberLiteral.make(c),
                NumberLiteral.make(
                    h,
                    new Unit(undefined, [Dimension.make(false, '°', 1)]),
                ),
            ],
        );

        lightness = l;
        chroma = c;
        hue = h;

        Projects.revise(
            $project,
            $project.getBindReplacements(
                values.getExpressions(),
                property.getName($locales),
                replacement,
            ),
        );
    }

    function getColorValue(bind: Bind, vals: OutputPropertyValueSet) {
        if ($project === undefined) return undefined;
        // The value of this facet on every value selected.
        const facets = vals.values.map((val) => {
            if ($project && val.expression instanceof Evaluate) {
                const mapping = val.expression.getMappingFor(
                    bind,
                    $project.getNodeContext(val.expression),
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
    let lightness = $derived(
        $project
            ? (getColorValue($project.shares.output.Color.inputs[0], values) ??
                  0)
            : 0,
    );
    let chroma = $derived(
        $project
            ? (getColorValue($project.shares.output.Color.inputs[1], values) ??
                  0)
            : 0,
    );
    let hue = $derived(
        $project
            ? (getColorValue($project.shares.output.Color.inputs[2], values) ??
                  0)
            : 0,
    );
</script>

<ColorChooser
    {id}
    {lightness}
    {chroma}
    {hue}
    change={handleChange}
    {editable}
/>
