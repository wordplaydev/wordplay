<script lang="ts">
    import { project, reviseProject } from '../../models/stores';
    import Dimension from '@nodes/Dimension';
    import Evaluate from '@nodes/Evaluate';
    import MeasurementLiteral from '@nodes/MeasurementLiteral';
    import Reference from '@nodes/Reference';
    import Unit from '@nodes/Unit';
    import { ColorType } from '@output/Color';
    import { preferredLanguages } from '@translation/translations';
    import Note from '../widgets/Note.svelte';
    import Slider from '../widgets/Slider.svelte';
    import type { OutputProperty } from '@transforms/OutputExpression';
    import type OutputPropertyValues from '@transforms/OutputPropertyValueSet';

    export let property: OutputProperty;
    export let values: OutputPropertyValues;

    $: lightness = getColorValue('lightness') ?? 0;
    $: chroma = getColorValue('chroma') ?? 0;
    $: hue = getColorValue('hue') ?? 0;

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(
        dim: 'lightness' | 'chroma' | 'hue',
        newValue: number
    ) {
        if ($project === undefined) return;

        // Find the corresponding property of the evaluate's Color and change it's value.
        const replacement = Evaluate.make(
            Reference.make(ColorType.names.getNames()[0], ColorType),
            [
                MeasurementLiteral.make(
                    (dim === 'lightness' ? newValue : lightness) + '%'
                ),
                MeasurementLiteral.make(dim === 'chroma' ? newValue : chroma),
                MeasurementLiteral.make(
                    dim === 'hue' ? newValue : hue,
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
            if ($project && val instanceof Evaluate) {
                const mapping = val.getMappingFor(
                    name,
                    $project.getNodeContext(val)
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

<div class="facet">
    <Note>{ColorType.inputs[0].names.getTranslation($preferredLanguages)}</Note>
    <Slider
        value={lightness}
        min={0}
        max={100}
        unit={'%'}
        increment={1}
        change={(newValue) => handleChange('lightness', newValue)}
        isDefault={false}
    />
</div>
<div class="facet">
    <Note>{ColorType.inputs[1].names.getTranslation($preferredLanguages)}</Note>
    <Slider
        value={chroma}
        min={0}
        max={100}
        unit={''}
        increment={1}
        change={(newValue) => handleChange('chroma', newValue)}
        isDefault={false}
    />
</div>
<div class="facet">
    <Note>{ColorType.inputs[2].names.getTranslation($preferredLanguages)}</Note>
    <Slider
        value={hue}
        min={0}
        max={360}
        unit={'°'}
        increment={1}
        change={(newValue) => handleChange('hue', newValue)}
        isDefault={false}
    />
</div>

<style>
    .facet {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
    }
</style>
