<script lang="ts">
    import { project, reviseProject } from '../../models/stores';
    import type Evaluate from '@nodes/Evaluate';
    import { parseMeasurement, toTokens } from '@parser/Parser';
    import Slider from '../widgets/Slider.svelte';

    export let evaluates: Evaluate[];
    export let name: string;
    export let value: number | undefined;
    export let min: number;
    export let max: number;
    export let unit: string;
    export let increment: number;
    export let set: boolean;

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: number) {
        if ($project === undefined) return;

        reviseProject(
            $project.getBindReplacements(
                evaluates,
                name,
                parseMeasurement(toTokens(newValue + unit))
            )
        );
    }
</script>

<Slider
    {value}
    {min}
    {max}
    {unit}
    {increment}
    change={handleChange}
    isDefault={!set}
/>
