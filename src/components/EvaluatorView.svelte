<svelte:options immutable={true}/>
<script lang="ts">
    import { languages } from "../models/languages";
    import type Evaluator from "../runtime/Evaluator";
    import { currentStep } from "../models/stores";
    import { afterUpdate } from "svelte";
    import { fade } from "svelte/transition";
    import Expression from "../nodes/Expression";

    export let evaluator: Evaluator;

    let view: HTMLElement | null = null;

    // After every update position it.
    afterUpdate( () => {
        position = getPosition(scrollLeft, scrollTop);
    })

    let scrollTop: number = 0;
    let scrollLeft: number = 0;

    let position: undefined | { left: string, top: string } = undefined;
    $: {
        position = getPosition(scrollLeft, scrollTop);
    }

    function getPosition(x: number, y: number) {

        // Find the node corresponding to the step being rendered.
        const node = evaluator.getStepNode();

        // Find the view of the node.
        let nodeView = node ? document.querySelector(`.node-view[data-id="${node.id}"]`) : undefined;
        
        // If we couldn't find a view for the node, it's probably because it was replaced by a value view.
        // Find the value corresponding to the node that just evaluated.
        if(nodeView === null) {
            const currentStep = evaluator.getCurrentStep();
            if(currentStep) {
                const firstExpression = 
                    currentStep.node instanceof Expression ? currentStep.node : evaluator.project.get(currentStep.node)?.getAncestors().find((a): a is Expression => a instanceof Expression);
                if(firstExpression) {
                    const value = evaluator.getLatestValueOf(firstExpression);
                    if(value)
                        nodeView = document.querySelector(`.value[data-id="${value.id}"]`);
                }
            }
        }

        // If there's no view, it's likely native code, so pick some generic place, like centered at the top of the screen
        if(nodeView) {
            // Find the position of the node.
            const rect = nodeView.getBoundingClientRect();
            let left = rect.right + x;
            let top = rect.bottom + y;

            // If the bubble would be outside the bounds of the editor, adjust it's position.
            const programSize = document.querySelector(".Program")?.getBoundingClientRect();
            const viewSize = view?.getBoundingClientRect();
            if(programSize && viewSize) {
                if(left + viewSize.width > programSize.width)
                    left = programSize.width - viewSize.width;
                if(top + viewSize.height > programSize.height)
                    top = programSize.height - viewSize.height;
            }
            
            return {
                left: `${left}px`, 
                top: `${top}px`
            }
        }
        // If we couldn't find anything, put it in the corner.
        else {
            return { left: `var(--wordplay-spacing)`, top: "var(--wordplay-spacing)" }
        }

    }

</script>

<svelte:window bind:scrollX={scrollLeft} bind:scrollY={scrollTop} />

{#if position}
    <section 
        class="evaluator" 
        bind:this={view} 
        transition:fade
        style:left={position.left}
        style:top={position.top}
    >
        <div class="explanation">
            {#if $currentStep}
                {#if evaluator.steppedToNode() }
                    <em>Evaluated to the selected code.</em>
                {/if}
                {#if evaluator.isAtBeginning() }
                    <em>At the beginning!</em>
                {/if}
                {$currentStep.getExplanations(evaluator)[$languages[0]]}
            {:else}
                {#if evaluator.steppedToNode() && evaluator.isDone() }
                    <em>The selected node didn't evaluate.</em>
                {/if}
                Done evaluating.
            {/if}
        </div>
    </section>
{/if}

<style>
    .evaluator {
        position: absolute;
        padding: var(--wordplay-spacing);
        z-index: var(--wordplay-layer-annotation);
        background-color: var(--wordplay-evaluation-color);
        color: var(--wordplay-background);
        box-shadow: -2px calc(2 * var(--wordplay-border-width)) calc(2 * var(--wordplay-border-width)) rgba(0,0,0,.5);
        max-width: 20em;
        border-radius: var(--wordplay-border-radius);
        transition: left, right, 0.25s ease-out;
    }
</style>