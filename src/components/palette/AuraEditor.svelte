<script lang="ts">
    import type Project from '@models/Project';
    import { Projects, locales } from '../../db/Database';
    import Slider from '@components/widgets/Slider.svelte';
    import ColorChooser from '@components/widgets/ColorChooser.svelte';
    import { getFirstName } from '@locale/Locale';
    import Evaluate from '@nodes/Evaluate';
    import Reference from '@nodes/Reference';
    import { createColorLiteral } from '@output/Color';
    import NumberLiteral from '@nodes/NumberLiteral';
    import Unit from '@nodes/Unit';
    import type OutputProperty from '@edit/OutputProperty';
    import type OutputPropertyValueSet from '@edit/OutputPropertyValueSet';
    import type Bind from '@nodes/Bind';

    export let project: Project;
    export let property: OutputProperty;
    export let values: OutputPropertyValueSet;
    export let editable: boolean;

    // Internal state for all aura values
    $: [lightness, chroma, hue] = getColor(values);
    let blur =
        getNumberBind(project.shares.output.Aura.inputs[1], values) ?? 0.05;
    let offsetX =
        getNumberBind(project.shares.output.Aura.inputs[2], values) ?? 0;
    let offsetY =
        getNumberBind(project.shares.output.Aura.inputs[3], values) ?? 0;

    function update() {
        // Make an Aura using the new value
        const replacement = Evaluate.make(
            Reference.make(
                project.shares.output.Aura.names.getNames()[0],
                project.shares.output.Aura,
            ),
            [
                createColorLiteral(
                    project,
                    project.getLocales(),
                    lightness,
                    chroma,
                    hue,
                ),
                NumberLiteral.make(blur ?? 0.05, Unit.create(['m'])),
                NumberLiteral.make(offsetX ?? 0, Unit.create(['m'])),
                NumberLiteral.make(offsetY ?? 0, Unit.create(['m'])),
            ],
        );

        Projects.revise(
            project,
            project.getBindReplacements(
                values.getExpressions(),
                property.getName(),
                replacement,
            ),
        );
    }

    function getColor(vals: OutputPropertyValueSet) {
        const context = project.getContext(project.getMain());
        // The color of every aura of every phrase value selected.
        const facets = vals.values.map((val) => {
            if (val.expression instanceof Evaluate) {
                const mapping = val.expression.getMappingFor(
                    project.shares.output.Aura.inputs[0],
                    project.getNodeContext(val.expression),
                );
                if (
                    mapping &&
                    mapping.given instanceof Evaluate &&
                    mapping.given.is(project.shares.output.Color, context)
                ) {
                    const color = mapping.given;
                    const lightnessExpression = color.getInput(
                        project.shares.output.Color.inputs[0],
                        context,
                    );
                    const chromaExpression = color.getInput(
                        project.shares.output.Color.inputs[1],
                        context,
                    );
                    const hueExpression = color.getInput(
                        project.shares.output.Color.inputs[2],
                        context,
                    );
                    return [
                        lightnessExpression instanceof NumberLiteral
                            ? lightnessExpression.getValue().toNumber()
                            : 0,
                        chromaExpression instanceof NumberLiteral
                            ? chromaExpression.getValue().toNumber()
                            : 0,
                        hueExpression instanceof NumberLiteral
                            ? hueExpression.getValue().toNumber()
                            : 0,
                    ] as const;
                } else return undefined;
            }
        });

        // If they're all the same, return a current color, otherwise [0, 0, 0]
        if (
            facets.every((facet1) =>
                facets.every(
                    (facet2) =>
                        (facet1 === undefined && facet2 === undefined) ||
                        (Array.isArray(facet1) &&
                            Array.isArray(facet2) &&
                            facet1[0] === facet2[0] &&
                            facet1[1] === facet2[1] &&
                            facet1[2] === facet2[2]),
                ),
            )
        )
            return facets[0] ?? [0, 0, 0];
        else return [0, 0, 0];
    }

    function getNumberBind(bind: Bind, vals: OutputPropertyValueSet) {
        // The value of this facet on every value selected.
        const facets = vals.values.map((val) => {
            if (val.expression instanceof Evaluate) {
                const mapping = val.expression.getMappingFor(
                    bind,
                    project.getNodeContext(val.expression),
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

{project.shares.output.Aura.names.getSymbolicName()}
<div class="aura">
    <ColorChooser
        {lightness}
        {chroma}
        {hue}
        change={(l, c, h) => {
            lightness = l;
            chroma = c;
            hue = h;
            update();
        }}
        {editable}
    />
    <Slider
        value={blur}
        min={0}
        max={0.5}
        increment={0.01}
        tip={$locales.get((l) => getFirstName(l.output.Aura.blur.names))}
        label={$locales.get((l) => getFirstName(l.output.Aura.blur.names))}
        unit={'m'}
        precision={2}
        change={(value) => {
            blur = value.toNumber();
            update();
        }}
        {editable}
    />
    <Slider
        value={offsetX}
        min={-0.5}
        max={0.5}
        increment={0.01}
        tip={$locales.get((l) => getFirstName(l.output.Aura.offsetX.names))}
        label={$locales.get((l) => getFirstName(l.output.Aura.offsetX.names))}
        unit={'m'}
        precision={2}
        change={(value) => {
            offsetX = value.toNumber();
            update();
        }}
        {editable}
    />
    <Slider
        value={offsetY}
        min={-0.5}
        max={0.5}
        increment={0.01}
        tip={$locales.get((l) => getFirstName(l.output.Aura.offsetY.names))}
        label={$locales.get((l) => getFirstName(l.output.Aura.offsetY.names))}
        unit={'m'}
        precision={2}
        change={(value) => {
            offsetY = value.toNumber();
            update();
        }}
        {editable}
    />
</div>

<style>
    .aura {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }
</style>
