<script lang="ts">
    import type OutputProperty from '@edit/output/OutputProperty';
    import type OutputPropertyValueSet from '@edit/output/OutputPropertyValueSet';
    import Dimension from '@nodes/Dimension';
    import Evaluate from '@nodes/Evaluate';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Reference from '@nodes/Reference';
    import Unit from '@nodes/Unit';
    import { Projects } from '@db/projects/Projects';
    import type Bind from '@nodes/Bind';
    import {
        getProject,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import ColorChooser from '@components/widgets/ColorChooser.svelte';
    import { must } from '@util/nullable';

    interface Props {
        property: OutputProperty;
        values: OutputPropertyValueSet;
        editable: boolean;
        id?: string | undefined;
    }

    // `property` is accepted for a uniform call site but unused here.
    let { values, editable, id = undefined }: Props = $props();

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
                must(
                    $project.shares.output.Color.names.getNames()[0],
                    "Color's name",
                ),
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
            values.getEditReplacements($project, replacement),
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
            ? (getColorValue(
                  // The basis declares Color's three inputs.
                  must(
                      $project.shares.output.Color.inputs[0],
                      "Color's lightness",
                  ),
                  values,
              ) ?? 0)
            : 0,
    );
    let chroma = $derived(
        $project
            ? (getColorValue(
                  must(
                      $project.shares.output.Color.inputs[1],
                      "Color's chroma",
                  ),
                  values,
              ) ?? 0)
            : 0,
    );
    let hue = $derived(
        $project
            ? (getColorValue(
                  must($project.shares.output.Color.inputs[2], "Color's hue"),
                  values,
              ) ?? 0)
            : 0,
    );
</script>

<ColorChooser
    {id}
    {lightness}
    {chroma}
    {hue}
    change={handleChange}
    start={() => selection?.setAdjusting(true)}
    release={() => selection?.setAdjusting(false)}
    {editable}
/>
