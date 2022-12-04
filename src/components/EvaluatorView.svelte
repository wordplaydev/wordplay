<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Evaluation from "../runtime/Evaluation";
    import type Evaluator from "../runtime/Evaluator";
    import type Step from "../runtime/Step";
    import EvaluationView from "./EvaluationView.svelte";
    import { currentStep } from "../models/stores";

    export let evaluator: Evaluator;

    $: languages = getLanguages();

    let step: Step | undefined;
    let evaluations: Evaluation[] = [];
    $: {
        // Update when step changes.
        $currentStep;
        evaluations = evaluator.evaluations;
        step = evaluator.getCurrentStep();
    }

</script>

<section class="evaluator">

    <p>
        {#if step}
            {step.getExplanations(evaluator)[$languages[0]]}
        {:else}
            ...
        {/if}
    </p>

    {#each evaluations as evaluation}
        <EvaluationView evaluation={evaluation} />
    {/each}

</section>

<style>
    section {
        padding: var(--wordplay-spacing);
        box-sizing: border-box;
    }
</style>