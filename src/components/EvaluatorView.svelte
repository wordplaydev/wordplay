<svelte:options immutable={true}/>
<script lang="ts">
    import { languages } from "../models/languages";
    import type Evaluator from "../runtime/Evaluator";
    import { currentStep } from "../models/stores";
    import type Source from "../models/Source";
    import { playing } from "../models/stores";

    export let evaluator: Evaluator;
    export let source: Source;

    $: stepping = !$playing && (evaluator.getCurrentEvaluation()?.getSource() === source || (evaluator.isDone() && source === evaluator.project.main));

</script>

{#if stepping}
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
    </section>
{/if}

<style>
    section {
        padding: var(--wordplay-spacing);
        z-index: 2;
        background-color: var(--wordplay-executing-color);
        color: var(--wordplay-background);
    }
</style>