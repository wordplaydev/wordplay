<script lang="ts">
    import { animationsOn } from '@models/stores';

    let left: HTMLElement | null;
    let right: HTMLElement | null;

    function animateEye(eye: HTMLElement, delay: number) {
        return eye.animate(
            [
                { height: 'var(--radius)' },
                { height: 'var(--radius)' },
                { height: 'var(--radius)' },
                { height: '.1em' },
                { height: 'var(--radius)' },
            ],
            { duration: 500, iterations: 1, delay }
        );
    }

    function getRandomDelay() {
        return 1000 * (Math.round(Math.random() * 2) + 1);
    }

    function animateEyes() {
        if (left && right) {
            offset = Math.round(Math.random() * 4 - 2);
            const delay = getRandomDelay();
            const animation = animateEye(left, delay);
            animateEye(right, delay);
            animation.onfinish = () => animateEyes();
        }
    }

    let offset = 0;
    $: {
        if (left && right && $animationsOn) {
            animateEyes();
        }
    }
</script>

<div class="eyes" style:--offset="{offset}px"
    ><div bind:this={left} class="eye left" /><div
        bind:this={right}
        class="eye right"
    /></div
>

<style>
    .eyes {
        position: absolute;
        left: 0;
        top: 0;
        display: inline-block;
        width: 100%;
        height: 100%;
        --radius: 0.2em;
    }

    .eye {
        position: absolute;
        display: inline-block;
        width: var(--radius);
        height: var(--radius);
        left: 50%;
        top: 31%;
        background: var(--wordplay-foreground);
        border: 2px solid var(--wordplay-background);
        border-radius: 50%;
    }

    :global(.animated) .eye {
        transition: transform 100ms;
    }

    .left {
        transform: translateX(
                calc(-1 * var(--radius) / 2 - 0.75 * var(--radius))
            )
            translateY(var(--offset));
    }

    .right {
        transform: translateX(
                calc(-1 * var(--radius) / 2 + 0.75 * var(--radius))
            )
            translateY(calc(-1 * var(--offset)));
    }
</style>
