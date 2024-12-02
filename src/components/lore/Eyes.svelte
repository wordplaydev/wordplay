<script module lang="ts">
    const Squint: `${Emotion}`[] = [
        'angry',
        'confused',
        'grumpy',
        'insecure',
        'sad',
        'precise',
    ];
    const Half: `${Emotion}`[] = [
        'arrogant',
        'cheerful',
        'eager',
        'happy',
        'kind',
        'neutral',
        'serious',
    ];
    const Wide: `${Emotion}`[] = [
        'bored',
        'curious',
        'excited',
        'scared',
        'surprised',
    ];
</script>

<script lang="ts">
    import { onDestroy } from 'svelte';
    import { animationFactor } from '../../db/Database';
    import type Emotion from '../../lore/Emotion';

    interface Props {
        invert: boolean;
        emotion: Emotion;
    }

    let { invert, emotion }: Props = $props();

    let left: HTMLElement | null = $state(null);
    let right: HTMLElement | null = $state(null);

    let animationLeft: Animation | undefined = undefined;
    let animationRight: Animation | undefined = undefined;

    function animateEye(eye: HTMLElement, delay: number) {
        if ($animationFactor > 0)
            return eye.animate(
                [
                    { transform: 'scaleY(1)' },
                    { transform: 'scaleY(1)' },
                    { transform: 'scaleY(1)' },
                    { transform: 'scaleY(0.1)' },
                    { transform: 'scaleY(1)' },
                ],
                { duration: 500, iterations: 1, delay },
            );
        else return undefined;
    }

    function getRandomDelay() {
        return 1000 * (Math.round(Math.random() * 2) + 1);
    }

    function animateEyes() {
        if (left && right && $animationFactor > 0) {
            offset = Math.round(Math.random() * 4 - 2);
            gaze = Math.round(Math.random() * 50);
            const delay = getRandomDelay();

            // Existing animation? Cancel it.
            cancelAnimations();

            // Create a new one.
            animationLeft = animateEye(left, delay);
            animationRight = animateEye(right, delay);

            // Recursively start a new animation when the left eye is done.
            if (animationLeft) animationLeft.onfinish = () => animateEyes();
        }
    }

    onDestroy(() => {
        cancelAnimations();
    });

    function cancelAnimations() {
        if (animationLeft) animationLeft.cancel();
        if (animationRight) animationRight.cancel();
    }

    let offset = $state(0);
    let gaze = $state(25);
    $effect(() => {
        if (left && right && $animationFactor > 0) animateEyes();
    });

    let eyes = Squint.includes(emotion)
        ? 'squint'
        : Half.includes(emotion)
          ? 'half'
          : Wide.includes(emotion)
            ? 'wide'
            : 'half';
</script>

<div
    role="presentation"
    class="eyes"
    class:invert
    style:--offset="{offset}px"
    style:--gaze="{gaze}%"
    ><div bind:this={left} class="eye left {eyes}"
        ><div class="pupil"></div></div
    ><div bind:this={right} class="eye right {eyes}"
        ><div class="pupil"></div></div
    ></div
>

<style>
    .eyes {
        position: absolute;
        left: 0;
        top: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10%;
        width: 100%;
        height: 100%;
        --radius: 0.25em;
        pointer-events: none;
    }

    .eye {
        position: relative;
        width: var(--radius);
        height: var(--radius);
        background: var(--wordplay-background);
        border: 0.02em solid var(--wordplay-foreground);
        border-radius: 50%;
        display: flex;
    }

    .squint {
        transform: scaleY(0.2);
    }

    .half {
        transform: scaleY(0.8);
    }

    .wide {
        transform: scaleY(1);
    }

    .invert .eye {
        background-color: var(--wordplay-foreground);
        border-color: var(--wordplay-background);
    }

    .eye {
        transition: transform calc(var(--animation-factor) * 100ms);
    }

    .pupil {
        transition:
            left calc(var(--animation-factor) * 100ms),
            top calc(var(--animation-factor) * 100ms);
    }

    .pupil {
        border-radius: 50%;
        position: relative;
        left: var(--gaze);
        top: var(--gaze);
        width: calc(var(--radius) / 3);
        height: calc(var(--radius) / 3);
        background-color: var(--wordplay-foreground);
    }

    .invert .pupil {
        background-color: var(--wordplay-background);
    }

    .left {
        top: calc(-7% + var(--offset));
    }

    .right {
        top: calc(-7% + -1 * var(--offset));
    }
</style>
