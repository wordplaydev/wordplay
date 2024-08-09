<svelte:options immutable={true} />

<script lang="ts">
    import type Reference from '@nodes/Reference';
    import NodeView from './NodeView.svelte';
    import { getEvaluation } from '../project/Contexts';
    import Evaluate from '@nodes/Evaluate';
    import type StreamValue from '@values/StreamValue';
    import type Value from '../../values/Value';
    import { animationFactor } from '../../db/Database';
    import Source from '@nodes/Source';

    export let node: Reference;

    let evaluation = getEvaluation();

    $: project = $evaluation?.evaluator.project;
    $: root = project?.getRoot(node);
    $: context =
        root?.root instanceof Source
            ? project?.getContext(root.root)
            : undefined;
    $: definition = node.resolve(context);

    let stream: StreamValue<Value, unknown> | undefined;
    $: if ($evaluation) {
        const parent = root?.getParent(node);
        stream =
            parent instanceof Evaluate
                ? $evaluation.evaluator.getStreamFor(parent)
                : undefined;
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
            $evaluation.evaluator.didStreamCauseReaction(stream)
        ) {
            animating = true;
            // Reset after the animation is done.
            setTimeout(() => (animating = false), $animationFactor * 200);
        }
    }
</script>

<span
    class:changed={animating}
    class={definition ? definition.getDescriptor() : ''}
>
    <NodeView node={node.name} />
</span>

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
            transform: scale(1.5);
        }
        60% {
            transform: scale(1.25);
        }
        80% {
            transform: scale(1.1);
        }
        100% {
            transform: scale(1);
        }
    }

    .StructureDefinition,
    .StreamDefinition {
        font-style: italic;
    }

    .StreamDefinition {
        text-shadow: 3px 3px 2px var(--wordplay-chrome);
    }
</style>
