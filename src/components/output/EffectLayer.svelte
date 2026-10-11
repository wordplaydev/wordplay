<!--
    The effects laid over a stage (#stage-effects), each as its own layer stacked in list
    order above the content and below the overlay, so a later effect applies to an earlier
    one's result. Painted effects share one animation loop, which reduced motion stops at a
    single still frame. Imported dynamically by StageView, so a stage without effects never
    loads it.
-->
<script lang="ts">
    import type { Effect, EffectLayer } from '#output/Effect/Effect.ts';
    import { onDestroy } from 'svelte';

    interface Props {
        effects: Effect[];
        /** A prefix unique to this stage, for the ids of its ripple filters. */
        id: string;
        /** Whether the stage's colors are being adapted to a dark canvas. */
        adapting: boolean;
        /** Whether effects may move; false paints one still frame. */
        moving: boolean;
    }

    let { effects, id, adapting, moving }: Props = $props();

    /** Painted film runs at film's rate; faster is costlier and reads as busier, not finer. */
    const PaintsPerSecond = 24;

    let layers: EffectLayer[] = $derived(
        effects.map((effect) => effect.getLayer(adapting)),
    );

    let width = $state(0);
    let height = $state(0);
    let canvases: (HTMLCanvasElement | undefined)[] = $state([]);
    let turbulences: (SVGFETurbulenceElement | undefined)[] = $state([]);

    let started: number | undefined = undefined;
    let lastPaint = -Infinity;
    let frame: number | undefined = undefined;

    function canvasSize(resolution: number) {
        return {
            width: Math.max(1, Math.round(width * resolution)),
            height: Math.max(1, Math.round(height * resolution)),
        };
    }

    function paint(seconds: number, force: boolean) {
        layers.forEach((layer, index) => {
            const canvas = canvases[index];
            if (layer.kind === 'paint' && canvas) {
                if (!force && !layer.moving) return;
                const size = canvasSize(layer.resolution);
                if (canvas.width !== size.width) canvas.width = size.width;
                if (canvas.height !== size.height) canvas.height = size.height;
                const context = canvas.getContext('2d');
                if (context)
                    layer.painter(context, seconds, size.width, size.height);
            }
            const turbulence = turbulences[index];
            if (layer.kind === 'ripple' && turbulence) {
                // Breathing the frequency in and out is what makes still noise read as moving water.
                const base = 1 / layer.scale;
                const phase = seconds * layer.speed;
                turbulence.setAttribute(
                    'baseFrequency',
                    `${base * (1 + 0.15 * Math.sin(phase))} ${base * (1 + 0.15 * Math.cos(phase * 0.8))}`,
                );
            }
        });
    }

    function step(now: number) {
        if (started === undefined) started = now;
        if (now - lastPaint >= 1000 / PaintsPerSecond) {
            lastPaint = now;
            paint((now - started) / 1000, false);
        }
        frame = requestAnimationFrame(step);
    }

    // Repaint everything whenever the effects or the stage's size change, then keep the
    // moving ones going, unless motion is reduced.
    $effect(() => {
        void layers;
        void width;
        void height;
        void canvases.length;
        paint(0, true);
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = undefined;
        if (moving) frame = requestAnimationFrame(step);
        return () => {
            if (frame !== undefined) cancelAnimationFrame(frame);
            frame = undefined;
        };
    });

    onDestroy(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
    });
</script>

<div
    class="effects"
    aria-hidden="true"
    bind:clientWidth={width}
    bind:clientHeight={height}
>
    {#each layers as layer, index (index)}
        {#if layer.kind === 'backdrop'}
            <div
                class="effect"
                style:backdrop-filter={layer.filter}
                style:-webkit-backdrop-filter={layer.filter}
            ></div>
        {:else if layer.kind === 'fill'}
            <div
                class="effect"
                style:background={layer.background}
                style:mix-blend-mode={layer.blend ?? null}
                style:opacity={layer.opacity}
            ></div>
        {:else if layer.kind === 'paint'}
            <canvas
                class="effect"
                class:blocky={!layer.smooth}
                style:mix-blend-mode={layer.blend ?? null}
                bind:this={canvases[index]}
            ></canvas>
        {:else if layer.kind === 'ripple'}
            <svg class="filters" width="0" height="0">
                <filter
                    id="{id}-ripple-{index}"
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    color-interpolation-filters="sRGB"
                >
                    <feTurbulence
                        bind:this={turbulences[index]}
                        type="fractalNoise"
                        baseFrequency={1 / layer.scale}
                        numOctaves="2"
                        result="noise"
                    />
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="noise"
                        scale={layer.amount}
                        xChannelSelector="R"
                        yChannelSelector="G"
                    />
                </filter>
            </svg>
        {/if}
    {/each}
</div>

<style>
    .effects {
        position: absolute;
        inset: 0;
        pointer-events: none;
        /* No z-index: painted after the content in document order, below the overlay's
           z-index so a HUD stays clear. A z-index would isolate the layers, and a blended
           Tint would then blend with nothing. */
        overflow: hidden;
    }

    .effect {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
    }

    .blocky {
        image-rendering: pixelated;
    }

    .filters {
        position: absolute;
    }
</style>
