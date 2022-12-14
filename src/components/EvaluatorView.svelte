<script lang="ts">
    import { languages } from "../models/languages";
    import type Evaluator from "../runtime/Evaluator";
    import { currentStep } from "../models/stores";
    import Timeline from "./Timeline.svelte";

    export let evaluator: Evaluator;

</script>

<section class="evaluator">
    <div class="explanation">
        {#if $currentStep}
            {#if evaluator.steppedToNode() }
                <p><em>Evaluated to the selected code.</em></p>
            {/if}
            {#if evaluator.isAtBeginning() }
                <p><em>At the beginning!</em></p>
            {/if}
            <p>{$currentStep.getExplanations(evaluator)[$languages[0]]}</p>
        {:else}
            {#if evaluator.steppedToNode() && evaluator.isDone() }
                <p><em>The selected node didn't evaluate.</em></p>
            {/if}
            <p>Done evaluating.</p>
        {/if}
    </div>
    <Timeline {evaluator} />
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