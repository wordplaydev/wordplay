<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import { TRANSLATE } from "../nodes/Translations";
    import type Evaluator from "../runtime/Evaluator";
    import EvaluationView from "./EvaluationView.svelte";

    export let evaluator: Evaluator;

    $: languages = getLanguages();

    $: ignoredStreams = Array.from(evaluator.streamsIgnoredDuringStepping).map(stream => stream.getTranslation($languages));

</script>

<div class="evaluator">

    <p>{evaluator.currentStep()?.getExplanations(evaluator)[$languages[0]]}</p>

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

    {#each evaluator.evaluations as evaluation}
        <EvaluationView evaluation={evaluation} />
    {/each}

</div>