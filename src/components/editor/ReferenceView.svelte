<svelte:options immutable={true} />

<script lang="ts">
    import type Reference from '@nodes/Reference';
    import NodeView from './NodeView.svelte';
    import { getEvaluation } from '../project/Contexts';
    import Evaluate from '@nodes/Evaluate';
    import type Stream from '@runtime/Stream';

    export let node: Reference;

    let evaluation = getEvaluation();

    let stream: Stream | undefined;
    $: {
        if ($evaluation) {
            const parent = $evaluation.evaluator.project
                .getRoot(node)
                ?.getParent(node);
            stream =
                parent instanceof Evaluate
                    ? $evaluation.evaluator.getNativeStreamFor(parent)
                    : undefined;
        }
    }

    // If this evaluated to the stream that recently changed, style it.
    let animating = false;
    $: {
        // Evaluated if...
        if (
            // There's evluation in this context
            $evaluation &&
            // The evaluator is playing
            $evaluation.playing &&
            // We're done evaluating
            $evaluation.step === undefined &&
            // This is associated with a stream
            stream !== undefined &&
            // The stream caused the most recent reaction
            $evaluation.evaluator.didStreamCauseReaction(stream) &&
            // This node was evaluated
            $evaluation.evaluator.getLatestValueOf(node) !== undefined
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
    .changed {
        display: inline-block;
        animation: pop 1;
        animation-duration: calc(var(--animation-factor) * 200ms);
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
