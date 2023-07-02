<!-- A component that shows various flying glyphs -->

<script lang="ts">
    import { onMount } from 'svelte';
    import Eyes from '../lore/Eyes.svelte';
    import UnicodeString from '../../models/UnicodeString';
    import { creator } from '../../db/Creator';
    import Emotion from '../../lore/Emotion';

    type Glyph = {
        glyph: string;
        index: number;
        size: number;
        x: number;
        y: number;
        angle: number;
        vx: number;
        vy: number;
        va: number;
    };

    let state: Glyph[] = [];

    let windowWidth: number, windowHeight: number;

    const bounds = 0.2;
    const glyphs = new UnicodeString(
        '😀മAあ韓नेئبअขማঅবাংབོދިεفગુע中رšՀꆈᓄქ'
    ).getSegments();

    let mounted = false;
    let previousTime: DOMHighResTimeStamp | undefined = undefined;

    function step(time: DOMHighResTimeStamp) {
        if (previousTime === undefined) previousTime = time;

        const elapsed =
            $creator.getAnimationFactor() > 0
                ? (time - previousTime) / $creator.getAnimationFactor()
                : 0;
        if (previousTime) {
            for (const glyph of state) {
                glyph.x += glyph.vx * (elapsed / 1000);
                glyph.y += glyph.vy * (elapsed / 1000);
                glyph.angle += (glyph.va * (elapsed / 1000)) % 360;

                if (glyph.x > windowWidth * (1 + bounds))
                    glyph.x = -windowWidth * bounds;
                if (glyph.x < -windowWidth * bounds)
                    glyph.x = windowWidth * (1 + bounds);
                if (glyph.y > windowHeight * (1 + bounds))
                    glyph.y = -windowHeight * bounds;
                if (glyph.y < -windowHeight * bounds)
                    glyph.y = windowHeight * (1 + bounds);

                const element = document.querySelector(
                    `[data-id="${glyph.index}"]`
                );
                if (element instanceof HTMLElement) {
                    element.style.left = `${glyph.x}px`;
                    element.style.top = `${glyph.y}px`;
                    element.style.transform = `rotate(${glyph.angle}deg)`;
                }
            }
        }

        previousTime = time;
        if (mounted && $creator.getAnimationFactor() > 0)
            window.requestAnimationFrame(step);
    }

    onMount(() => {
        mounted = true;
        const random: string[] = [];
        // Compute a number of glyphs roughly proportional to the window size.
        const count = Math.min(
            100,
            Math.round(windowWidth * windowHeight) / 40000
        );
        for (let i = 0; i < count; i++)
            random.push(glyphs[Math.floor(Math.random() * glyphs.length)]);

        state = random.map((glyph, index) => {
            return {
                glyph,
                index,
                size: Math.round(Math.random() * 128 + 16),
                x: Math.random() * windowWidth,
                y: Math.random() * windowHeight,
                angle: Math.round(Math.random() * 360),
                vx: Math.round(Math.random() * 200 - 100),
                vy: Math.round(Math.random() * 200 - 100),
                va: Math.round(Math.random() * 30 - 50),
            };
        });

        window.requestAnimationFrame(step);

        return () => (mounted = false);
    });

    $: if ($creator.getAnimationFactor() > 0)
        window.requestAnimationFrame(step);
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<div class="background" role="presentation">
    {#each state as glyph}
        <div
            role="presentation"
            class="glyph"
            data-id={glyph.index}
            style:font-size="{glyph.size}pt"
            >{glyph.glyph}<Eyes invert={false} emotion={Emotion.Neutral} /></div
        >
    {/each}
</div>

<style>
    .background {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: -1;
        overflow: hidden;
    }

    .glyph {
        font-size: 48pt;
        position: absolute;
        opacity: 0.05;
        user-select: none;
    }
</style>
