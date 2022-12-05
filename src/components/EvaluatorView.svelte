<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Evaluator from "../runtime/Evaluator";
    import { currentStep } from "../models/stores";

    export let evaluator: Evaluator;

    $: languages = getLanguages();

</script>

<section class="evaluator">
    {#if $currentStep}
        {#if evaluator.steppedToNode() }
            <p><em>Evaluated to the selected code.</em></p>
        {/if}
        <p>{$currentStep.getExplanations(evaluator)[$languages[0]]}</p>
    {:else}
        {#if evaluator.steppedToNode() && evaluator.isDone() }
            <p><em>The selected node didn't evaluate.</em></p>
        {/if}
        <p>Done evaluating.</p>
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