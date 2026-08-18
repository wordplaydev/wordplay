<script lang="ts">
    import { animationFactor } from '@db/Database';
    import { musicActivity } from '@output/Music/activity';
    import audio from '@output/Music/MusicAudio';
    import {
        blastFor,
        fall,
        spectrumBands,
        strike,
        tintToCSS,
        type Tint,
    } from '@output/Music/lightshow';
    import { onDestroy } from 'svelte';

    interface Props {
        /** The reconciliation names of the music on this stage. */
        names: string[];
    }

    let { names }: Props = $props();

    /** How many bands the spectrum is drawn as. Few and wide, so it reads as
     * light rather than as a data display. */
    const Bands = 14;

    let tint = $state<Tint>({ hue: 0, energy: 0 });
    let canvas = $state<HTMLCanvasElement | undefined>(undefined);

    /** Strike counters already reacted to, so a repeated note at the same
     * loudness still registers. */
    const seen = new Map<string, number>();

    let frame: number | undefined = undefined;
    let last: number | undefined = undefined;

    $effect(() => {
        const reduced = $animationFactor === 0;
        const step = (now: number) => {
            const elapsed = last === undefined ? 0 : (now - last) / 1000;
            last = now;

            // The notes that have started since the last frame; a repeated
            // note at the same loudness still counts, which is what the
            // strike counter is for.
            const sounding = names.flatMap(
                (name) => $musicActivity.get(name) ?? [],
            );
            const fresh = sounding.filter(
                (entry) =>
                    seen.get(`${entry.instrument}-${entry.track}`) !==
                    entry.strike,
            );
            for (const entry of sounding)
                seen.set(`${entry.instrument}-${entry.track}`, entry.strike);

            // Fall toward rest, then ease toward whatever just sounded. Both
            // move colour only; lightness and opacity are fixed, which is
            // what keeps this from flashing.
            let next = fall(tint, elapsed);
            const blast = blastFor(fresh);
            if (blast !== undefined) next = strike(next, blast, elapsed);
            tint = next;

            drawSpectrum(reduced);
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => {
            if (frame !== undefined) cancelAnimationFrame(frame);
            frame = undefined;
            last = undefined;
        };
    });

    /** Paint the spectrum as a soft aurora: low frequencies at the left,
     * high at the right, glowing up from the floor. */
    function drawSpectrum(reduced: boolean) {
        const element = canvas;
        if (element === undefined) return;
        const context = element.getContext('2d');
        if (context === null) return;

        const width = element.clientWidth;
        const height = element.clientHeight;
        if (width === 0 || height === 0) return;
        if (element.width !== width) element.width = width;
        if (element.height !== height) element.height = height;

        context.clearRect(0, 0, width, height);
        const spectrum = audio.getSpectrum();
        if (spectrum === undefined) return;

        const bands = spectrumBands(spectrum, Bands);
        const bandWidth = width / Bands;
        for (let band = 0; band < bands.length; band++) {
            // Reduced motion keeps the colour but stops the height moving, so
            // the music is still visible without anything pulsing.
            const level = reduced ? 0.35 : bands[band];
            if (level <= 0.02) continue;
            // Hue sweeps across the spectrum, so pitch has a place as well as
            // a brightness.
            const hue = (tint.hue + band * (300 / Bands)) % 360;
            const top = height * (1 - level * 0.9);
            const gradient = context.createLinearGradient(0, top, 0, height);
            // A narrow opacity range, and a fixed lightness, so the bands
            // shimmer in colour rather than blinking.
            gradient.addColorStop(
                0,
                `lch(62% ${30 + level * 70} ${hue}deg / 0)`,
            );
            gradient.addColorStop(
                1,
                `lch(62% ${30 + level * 70} ${hue}deg / ${0.2 + level * 0.18})`,
            );
            context.fillStyle = gradient;
            context.fillRect(
                band * bandWidth,
                top,
                bandWidth + 1,
                height - top,
            );
        }
    }

    onDestroy(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
    });
</script>

<!-- Decorative: the music's own description and the orchestra carry the
     content for screen readers. -->
<div class="lightshow" aria-hidden="true">
    <div class="wash" style:background={tintToCSS(tint)}></div>
    <canvas class="spectrum" bind:this={canvas}></canvas>
</div>

<style>
    .lightshow {
        position: absolute;
        inset: 0;
        pointer-events: none;
        /* Over the stage's own background but under its output, so a
           creator's background stays the base rather than being replaced. */
        z-index: 0;
        overflow: hidden;
    }

    .wash,
    .spectrum {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
    }

    /* Plainly composited, not screened: a screen blend brightens whatever is
       underneath as chroma rises, which would put back exactly the luminance
       swing this rendering exists to avoid. */
    .wash {
        mix-blend-mode: normal;
    }

    .spectrum {
        /* Blurred so it reads as light rather than as a bar chart. */
        filter: blur(calc(0.6vh + 2px));
        opacity: 0.9;
    }
</style>
