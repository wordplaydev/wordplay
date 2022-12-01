<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import { TRANSLATE } from "../nodes/Translations";
    import type Evaluation from "../runtime/Evaluation";
    import type Evaluator from "../runtime/Evaluator";
    import type Step from "../runtime/Step";
    import EvaluationView from "./EvaluationView.svelte";

    export let evaluator: Evaluator;

    $: languages = getLanguages();

    $: ignoredStreams = Array.from(evaluator.streamsIgnoredDuringStepping).map(stream => stream.getTranslation($languages));

    let step: Step | undefined;
    let previousEvaluator = evaluator;
    let evaluations: Evaluation[] = [];
    $: {
        previousEvaluator?.ignore(handleUpdate);
        evaluator?.observe(handleUpdate);
        handleUpdate();
    }

    function handleUpdate() { 
        step = evaluator.currentStep();
        evaluations = evaluator.evaluations;
    }


</script>

<section class="evaluator">

    <p>{step?.getExplanations(evaluator)[$languages[0]]}</p>

    <p>{
        evaluator.streamsIgnoredDuringStepping.size > 0 ?
            {
                eng:`You're stepping, so we ignored ${ignoredStreams.join(", ")}`,
                "😀": `${TRANSLATE} ${ignoredStreams.join(", ")}`
            }[$languages[0]]
             : 
            ""
        }
    </p>

    {#each evaluations as evaluation}
        <EvaluationView evaluation={evaluation} />
    {/each}

</section>

<style>
    section {
        padding: var(--wordplay-spacing);
    }
</style>