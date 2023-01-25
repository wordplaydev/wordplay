<svelte:options immutable={true} />

<script lang="ts">
    import type Reference from '@nodes/Reference';
    import NodeView from './NodeView.svelte';
    import { currentStep, playing } from '../../models/stores';
    import Stream from '@runtime/Stream';
    import { getProject } from '../project/Contexts';

    export let node: Reference;

    let project = getProject();

    $: context = $project.getNodeContext(node);
    $: definition = node.resolve(context);

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
            definition instanceof Stream &&
            // The stream caused the most recent reaction
            $project.evaluator.didStreamCauseReaction(definition) &&
            // This node was evaluated
            $project.evaluator.getLatestValueOf(node) !== undefined;
        if (evaluated) {
            animating = true;
            // Reset after the animation is done.
            setTimeout(() => (animating = false), 250);
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
    .changed :global(.token-view) {
        display: inline-block;
        animation: pop 0.25s 1;
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
