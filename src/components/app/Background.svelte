<!-- A component that shows various flying glyphs -->

<script lang="ts">
    import { onMount } from 'svelte';
    import Eyes from '../lore/Eyes.svelte';

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
    const glyphs = 'മAあ韓नेئبअขማঅবাংབོދިεفગુע中رšՀꆈᓄქ'.split('');

    onMount(() => {
        const random: string[] = [];
        for (
            let i = 0;
            i < Math.min(100, Math.round(windowWidth * windowHeight) / 20000);
            i++
        )
            random.push(glyphs[Math.floor(Math.random() * glyphs.length)]);

        state = random.map((glyph, index) => {
            return {
                glyph,
                index,
                size: Math.round(Math.random() * 256 + 16),
                x: Math.random() * windowWidth,
                y: Math.random() * windowHeight,
                angle: Math.round(Math.random() * 360),
                vx: Math.round(Math.random() * 200 - 100),
                vy: Math.round(Math.random() * 200 - 100),
                va: Math.round(Math.random() * 30 - 50),
            };
        });

        let previousTime: DOMHighResTimeStamp | undefined = undefined;
        function step(time: DOMHighResTimeStamp) {
            if (previousTime === undefined) {
                previousTime = time;
            } else {
                const elapsed = time - previousTime;
                if (previousTime) {
                    for (const glyph of state) {
                        glyph.x += glyph.vx * (elapsed / 1000);
                        if (glyph.x > windowWidth * (1 + bounds))
                            glyph.x = -windowWidth * bounds;
                        if (glyph.x < -windowWidth * bounds)
                            glyph.x = windowWidth * (1 + bounds);
                        if (glyph.y > windowHeight * (1 + bounds))
                            glyph.y = -windowHeight * bounds;
                        if (glyph.y < -windowHeight * bounds)
                            glyph.y = windowHeight * (1 + bounds);
                        glyph.y += glyph.vy * (elapsed / 1000);
                        glyph.angle += (glyph.va * (elapsed / 1000)) % 360;

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
            }
            window.requestAnimationFrame(step);
        }

        window.requestAnimationFrame(step);
    });
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

<div class="background" role="presentation">
    {#each state as glyph}
        <div
            class="glyph"
            data-id={glyph.index}
            style:font-size="{glyph.size}pt"
            >{glyph.glyph}<Eyes invert={false} /></div
        >
    {/each}
</div>

<style>
    .background {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
    }

    .glyph {
        font-size: 48pt;
        position: absolute;
        opacity: 0.05;
    }
</style>
