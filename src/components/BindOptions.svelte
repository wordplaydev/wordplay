<script lang="ts">
    import {
        getSelectedOutput,
        translateSelectedOutputs,
    } from '../editor/util/Contexts';
    import { project, updateProject } from '../models/stores';
    import type Evaluate from '../nodes/Evaluate';
    import TextLiteral from '../nodes/TextLiteral';
    import { parseMeasurement, toTokens } from '../parser/Parser';
    import Options from './Options.svelte';

    export let evaluates: Evaluate[];
    export let name: string;
    export let value: string | undefined;
    export let options: string[];

    let selectedOutput = getSelectedOutput();

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined) return;

        const replacements = $project.getBindReplacments(
            evaluates,
            name,
            newValue ? TextLiteral.make(newValue) : undefined
        );

        // Replace the old selected output with the new one
        selectedOutput.set(
            translateSelectedOutputs($selectedOutput, replacements)
        );

        // Update the project with the new sources.
        updateProject($project.wWithRevisedNodes(replacements));
    }
</script>

<Options {value} {options} change={handleChange} />
