<script lang="ts">
    import type Evaluator from "../runtime/Evaluator";
    import EvaluationView from "./EvaluationView.svelte";

    export let evaluator: Evaluator;

</script>

<div class="evaluator">

    <p>{evaluator.currentStep()?.getExplanations(evaluator)["eng"] ?? "No step"}</p>

    <p>{
        evaluator.streamsIgnoredDuringStepping.size > 0 ?
            `You're stepping, so we ignored ${Array.from(evaluator.streamsIgnoredDuringStepping).map(stream => stream.getNames()["eng"]).join(", ")}` : 
            ""
        }
    </p>

    {#each evaluator.evaluations as evaluation}
        <EvaluationView evaluation={evaluation} />
    {/each}

</div>