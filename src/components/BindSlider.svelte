<script lang="ts">
    import { getSelectedOutput } from '../editor/util/Contexts';
    import { project, updateProject } from '../models/stores';
    import type Evaluate from '../nodes/Evaluate';
    import { parseMeasurement, toTokens } from '../parser/Parser';
    import Slider from './Slider.svelte';

    export let evaluates: Evaluate[];
    export let name: string;
    export let value: number | undefined;
    export let min: number;
    export let max: number;
    export let unit: string;
    export let increment: number;
    export let set: boolean;

    let selectedOutput = getSelectedOutput();

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: number) {
        if ($project) {
            const replacements: [Evaluate, Evaluate | undefined][] =
                evaluates.map((evaluate) => [
                    evaluate,
                    $project
                        ? evaluate.withBindAs(
                              name,
                              parseMeasurement(toTokens(newValue + unit)),
                              $project.getNodeContext(evaluate)
                          )
                        : undefined,
                ]);

            // Replace the old selected output with the new one
            selectedOutput.set(
                $selectedOutput.map((n) => {
                    const rep = replacements.find((rep) => rep[0] === n);
                    return rep === undefined || rep[1] === undefined
                        ? n
                        : rep[1];
                })
            );

            // Update the project with the new sources.
            updateProject($project.wWithRevisedNodes(replacements));
        }
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
