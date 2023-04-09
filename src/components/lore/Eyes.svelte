<script lang="ts">
    import { animationsOn } from '@models/stores';

    export let invert: boolean;

    let left: HTMLElement | null;
    let right: HTMLElement | null;

    function animateEye(eye: HTMLElement, delay: number) {
        return eye.animate(
            [
                { transform: 'scaleY(1)' },
                { transform: 'scaleY(1)' },
                { transform: 'scaleY(1)' },
                { transform: 'scaleY(0.1)' },
                { transform: 'scaleY(1)' },
            ],
            { duration: 500, iterations: 1, delay }
        );
    }

    function getRandomDelay() {
        return 1000 * (Math.round(Math.random() * 2) + 1);
    }

    function animateEyes() {
        if (left && right && $animationsOn) {
            offset = Math.round(Math.random() * 4 - 2);
            gaze = Math.round(Math.random() * 50);
            const delay = getRandomDelay();
            const animation = animateEye(left, delay);
            animateEye(right, delay);
            animation.onfinish = () => animateEyes();
        }
    }

    let offset = 0;
    let gaze = 25;
    $: {
        if (left && right && $animationsOn) {
            animateEyes();
        }
    }
</script>

<div
    role="presentation"
    class="eyes"
    class:invert
    style:--offset="{offset}px"
    style:--gaze="{gaze}%"
    ><div bind:this={left} class="eye left"><div class="pupil" /></div><div
        bind:this={right}
        class="eye right"><div class="pupil" /></div
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
        gap: 0.05em;
        width: 100%;
        height: 100%;
        --radius: 0.2em;
    }

    .eye {
        position: relative;
        width: var(--radius);
        height: var(--radius);
        background: var(--wordplay-background);
        border: 1px solid var(--wordplay-foreground);
        border-radius: 50%;
        display: flex;
    }

    .invert .eye {
        background-color: var(--wordplay-foreground);
        border-color: var(--wordplay-background);
    }

    :global(.animated) .eye {
        transition: transform 100ms;
    }

    :global(.animated) .pupil {
        transition: left 100ms, top 100ms;
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
        top: var(--offset);
    }

    .right {
        top: calc(-1 * var(--offset));
    }
</style>
