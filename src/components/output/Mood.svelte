<script lang="ts">
    import { animationFactor } from '@db/Database';
    import type Music from '@output/Music/Music';
    import { musicActivity } from '@output/Music/activity';
    import { spectrumBands } from '@output/Music/lightshow';
    import audio from '@output/Music/MusicAudio';
    import { signatureOf } from '@output/Music/musicData';
    import {
        advance,
        analyzeMood,
        colorToCSS,
        deformOf,
        easeMood,
        Harmonics,
        Lobes,
        lobeCentre,
        lobeColor,
        lobeRadius,
        normalizeInk,
        restingMood,
        restingPulse,
        strike,
        summarize,
        type Mood,
        type Pulse,
    } from '@output/Music/mood';
    import { onDestroy } from 'svelte';

    interface Props {
        /** The music on this stage; mood reads its notes, not just its name. */
        musics: Music[];
    }

    let { musics }: Props = $props();

    let canvas: HTMLCanvasElement | undefined = $state(undefined);

    /** Vertices per lobe outline. Enough that the curve reads as smooth once
     * the backing store is scaled up and blurred. */
    const Vertices = 44;
    /** Spectrum bands: one per lobe for the ink shares, and a few more for the
     * radial harmonics. */
    const Bands = Math.max(Lobes, Harmonics * 2);
    /** The backing store is deliberately small. Scaling it up to the region is
     * most of why this is cheap, and the bilinear upscale blurs for free — so
     * the softness survives even where `filter: blur()` doesn't. That makes the
     * resolution a safety decision as much as a performance one: hard edges
     * would read as both a pattern risk and as flicker. */
    const BackingWidth = 256;
    const BackingHeight = 128;

    let datas = $derived(musics.map((music) => music.toData()));
    /** Re-analyze only when the music actually changes. `signatureOf` is the
     * player's own did-this-change test, so an evaluation that left the music
     * alone costs one string compare instead of a walk of every note. */
    let signature = $derived(datas.map(signatureOf).join('|'));

    let analyzed = '';
    let target: Mood = $state(restingMood());
    $effect(() => {
        if (signature === analyzed) return;
        analyzed = signature;
        target = analyzeMood(datas);
    });

    /** The eased character, and the runtime pulse. */
    let mood: Mood = restingMood();
    let pulse: Pulse = restingPulse();

    /** Strike counters already reacted to, so a repeated note at the same
     * loudness still registers. Rebuilt when the set of music changes, so a
     * long-running stage whose music keeps changing doesn't grow this
     * forever. */
    let seen = new Map<string, number>();
    let seenFor = '';

    let frame: number | undefined = undefined;
    let last: number | undefined = undefined;

    $effect(() => {
        const reduced = $animationFactor === 0;
        const step = (now: number) => {
            const elapsed = last === undefined ? 0 : (now - last) / 1000;
            last = now;

            const names = musics.map((music) => music.getName());
            const key = names.join('|');
            if (key !== seenFor) {
                seen = new Map();
                seenFor = key;
            }

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

            const spectrum = audio.getSpectrum();
            const bands =
                spectrum === undefined ? [] : spectrumBands(spectrum, Bands);

            mood = easeMood(mood, target, elapsed);
            pulse = advance(pulse, mood, bands, elapsed, reduced);
            const blow = summarize(fresh);
            if (blow !== undefined && !reduced)
                pulse = strike(pulse, mood, blow);

            paint();
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => {
            if (frame !== undefined) cancelAnimationFrame(frame);
            frame = undefined;
            last = undefined;
        };
    });

    /**
     * Paint the cloud: one soft radial-gradient lobe per share, its outline
     * deformed by the spectrum's own harmonics.
     *
     * Deliberately `source-over` rather than an additive or screen blend. An
     * additive blend brightens whatever is underneath as energy rises, which
     * would put back exactly the luminance swing this rendering exists to
     * avoid — the same reason `LightShow` refuses `mix-blend-mode: screen`.
     */
    function paint() {
        const element = canvas;
        if (element === undefined) return;
        const context = element.getContext('2d');
        if (context === null) return;

        // Resizing a canvas clears it, so only ever assign when it changed.
        if (element.width !== BackingWidth) element.width = BackingWidth;
        if (element.height !== BackingHeight) element.height = BackingHeight;
        context.clearRect(0, 0, BackingWidth, BackingHeight);

        const radii = normalizeInk(pulse.shares);
        const deform = deformOf(mood, pulse);

        for (let lobe = 0; lobe < Lobes; lobe++) {
            const centre = lobeCentre(mood, pulse, lobe);
            const colour = lobeColor(mood, pulse, lobe);
            const cx = centre.x * BackingWidth;
            // y is measured up from the floor of the band.
            const cy = (1 - centre.y) * BackingHeight;
            const scale = BackingHeight;

            context.beginPath();
            for (let v = 0; v <= Vertices; v++) {
                const theta = (v / Vertices) * Math.PI * 2;
                const r =
                    lobeRadius(
                        radii[lobe],
                        deform,
                        pulse.harmonics,
                        pulse.phases,
                        theta,
                    ) * scale;
                const x = cx + Math.cos(theta) * r;
                const y = cy + Math.sin(theta) * r * 0.72;
                if (v === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            }
            context.closePath();

            const reach = radii[lobe] * scale * 1.25;
            const gradient = context.createRadialGradient(
                cx,
                cy,
                0,
                cx,
                cy,
                reach,
            );
            gradient.addColorStop(0, colorToCSS(colour));
            gradient.addColorStop(
                0.6,
                colorToCSS({ ...colour, alpha: colour.alpha * 0.45 }),
            );
            gradient.addColorStop(1, colorToCSS({ ...colour, alpha: 0 }));
            context.fillStyle = gradient;
            context.fill();
        }
    }

    onDestroy(() => {
        if (frame !== undefined) cancelAnimationFrame(frame);
    });
</script>

<!-- Decorative: each Music already carries a description for screen readers,
     and this rendering says nothing the description doesn't. -->
<div class="mood" aria-hidden="true">
    <canvas bind:this={canvas}></canvas>
</div>

<style>
    /* A band along the floor, under the creator's output like the light show,
       so it can never cover their work. */
    .mood {
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        /* Its own, not a shared token: the floor band is allowed to sit on
           top of this rendering, so nothing else needs to know how tall it is. */
        height: 42%;
        z-index: 0;
        pointer-events: none;
        overflow: hidden;
        /* Dissolves upward rather than ending on a line, which also keeps the
           middle of the stage — where a creator's text usually sits — clear. */
        mask-image: linear-gradient(to top, black 45%, transparent);
    }

    canvas {
        width: 100%;
        height: 100%;
        /* The backing store is far smaller than this, so the upscale is most
           of the softness; the blur finishes it. */
        filter: blur(calc(0.8vh + 3px));
    }
</style>
