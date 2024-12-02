<script lang="ts">
    import type Reference from '@nodes/Reference';
    import NodeView from './NodeView.svelte';
    import { getEvaluation } from '../project/Contexts';
    import Evaluate from '@nodes/Evaluate';
    import type StreamValue from '@values/StreamValue';
    import type Value from '../../values/Value';
    import { animationFactor } from '../../db/Database';
    import Source from '@nodes/Source';

    interface Props {
        node: Reference;
    }

    let { node }: Props = $props();

    let evaluation = getEvaluation();

    let project = $derived($evaluation?.evaluator.project);
    let root = $derived(project?.getRoot(node));
    let context = $derived(
        root?.root instanceof Source
            ? project?.getContext(root.root)
            : undefined,
    );
    let definition = $derived(node.resolve(context));

    let stream: StreamValue<Value, unknown> | undefined = $derived.by(() => {
        if ($evaluation) {
            const parent = root?.getParent(node);
            return parent instanceof Evaluate
                ? $evaluation.evaluator.getStreamFor(parent)
                : undefined;
        }
        return undefined;
    });

    // If this evaluated to the stream that recently changed, style it.
    let animating = $state(false);
    $effect(() => {
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
    });
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
        text-decoration: underline dotted;
    }
</style>
