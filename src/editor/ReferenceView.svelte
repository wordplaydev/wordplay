<svelte:options immutable={true}/>
<script lang="ts">
    import type Reference from "../nodes/Reference";
    import NodeView from "./NodeView.svelte";
    import { project, currentStep, playing } from "../models/stores";
    import Stream from "../runtime/Stream";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    
    export let node: Reference;

    $: context = $project.getNodeContext(node);
    $: stream = context === undefined ? undefined : node.getDefinition(context);

    // If this evaluated to the stream that recently changed, style it.
    let evaluated = false;
    let animating = false;
    $: {
        // Evaluated if...
        evaluated = 
            // The evaluator is playing    
            $playing && 
            // We're done evaluating
            $currentStep === undefined && 
            // This node refers to a stream
            stream instanceof Stream && 
            // The stream caused the most recent reaction
            $project.evaluator.didStreamCauseReaction(stream) && 
            // This node was evaluated
            $project.evaluator.getLatestValueOf(node) !== undefined;
        if(evaluated) {
            animating = true;
            // Reset after the animation is done.
            setTimeout(() => animating = false, 250);
        }
    }

</script>

{#if animating}
    <span class="changed">
        <NodeView node={node.name} /><NodeSequenceView nodes={node.types} />
    </span>
{:else}
    <NodeView node={node.name} /><NodeSequenceView nodes={node.types} />
{/if}


<style>
    .changed :global(.token-view) {
        display: inline-block;
        animation: pop 0.25s 1;
    }

    @keyframes pop {
        0% { transform: scale(1); }
        20% { transform: scale(2); }
        60% { transform: scale(1.5); }
        80% { transform: scale(1.25); }
        100% { transform: scale(1); }
    }
</style>