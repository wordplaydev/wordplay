<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Evaluator from "../runtime/Evaluator";
    import type Step from "../runtime/Step";
    import { currentStep } from "../models/stores";

    export let evaluator: Evaluator;

    $: languages = getLanguages();

    let step: Step | undefined;
    $: {
        // Update when step changes.
        $currentStep;
        step = evaluator.getCurrentStep();
    }

</script>

<section class="evaluator">
    {#if step}
        {step.getExplanations(evaluator)[$languages[0]]}
    {:else}
        ...
    {/if}
</section>

<style>
    section {
        background-color: var(--wordplay-executing-color);
        color: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        box-sizing: border-box;
        z-index: 2;
    }
</style>