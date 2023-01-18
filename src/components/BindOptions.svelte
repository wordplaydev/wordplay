<script lang="ts">
    import { project, reviseProject } from '../models/stores';
    import type Evaluate from '../nodes/Evaluate';
    import TextLiteral from '../nodes/TextLiteral';
    import Options from './Options.svelte';

    export let evaluates: Evaluate[];
    export let name: string;
    export let value: string | undefined;
    export let options: string[];

    // Whenever the slider value changes, revise the Evaluates to match the new value.
    function handleChange(newValue: string | undefined) {
        if ($project === undefined) return;
        reviseProject(
            $project.getBindReplacements(
                evaluates,
                name,
                newValue ? TextLiteral.make(newValue) : undefined
            )
        );
    }
</script>

<Options {value} {options} change={handleChange} />
