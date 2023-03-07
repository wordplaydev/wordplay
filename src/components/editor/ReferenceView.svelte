<svelte:options immutable={true} />

<script lang="ts">
    import type Reference from '@nodes/Reference';
    import NodeView from './NodeView.svelte';
    import {
        getCurrentStep,
        getEvaluator,
        getPlaying,
        getProject,
    } from '../project/Contexts';
    import Evaluate from '@nodes/Evaluate';
    import type Stream from '@runtime/Stream';

    export let node: Reference;

    let project = getProject();
    let evaluator = getEvaluator();
    let playing = getPlaying();
    let currentStep = getCurrentStep();

    let stream: Stream | undefined;
    $: {
        const context = $project ? $project.getNodeContext(node) : undefined;
        const parent = context ? node.getParent(context) : undefined;
        stream =
            parent instanceof Evaluate
                ? $evaluator.getNativeStreamFor(parent)
                : undefined;
    }

    // If this evaluated to the stream that recently changed, style it.
    let animating = false;
    $: {
        // Evaluated if...
        if (
            // The evaluator is playing
            $playing &&
            // We're done evaluating
            $currentStep === undefined &&
            // There's a project
            $project !== undefined &&
            // This is associated with a stream
            stream !== undefined &&
            // The stream caused the most recent reaction
            $evaluator.didStreamCauseReaction(stream) &&
            // This node was evaluated
            $evaluator.getLatestValueOf(node) !== undefined
        ) {
            animating = true;
            // Reset after the animation is done.
            setTimeout(() => (animating = false), 200);
        }
    }
</script>

{#if animating}
    <span class="changed">
        <NodeView node={node.name} />
    </span>
{:else}
    <NodeView node={node.name} />
{/if}

<style>
    :global(.animated) .changed {
        display: inline-block;
        animation: pop 1;
        animation-duration: 200;
    }

    @keyframes pop {
        0% {
            transform: scale(1);
        }
        20% {
            transform: scale(2);
        }
        60% {
            transform: scale(1.5);
        }
        80% {
            transform: scale(1.25);
        }
        100% {
            transform: scale(1);
        }
    }
</style>
