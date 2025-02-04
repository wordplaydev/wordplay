<script lang="ts">
    import { onMount } from 'svelte';
    import Eyes from '../lore/Eyes.svelte';
    import UnicodeString from '../../unicode/UnicodeString';
    import { animationFactor } from '../../db/Database';
    import Emotion from '../../lore/Emotion';
    import { withColorEmoji } from '../../unicode/emoji';

    type Character = {
        symbol: string;
        index: number;
        size: number;
        x: number;
        y: number;
        angle: number;
        vx: number;
        vy: number;
        va: number;
    };

    let scene: Character[] = $state([]);

    let windowWidth: number = $state(0),
        windowHeight: number = $state(0);

    const bounds = 0.2;
    const symbols = new UnicodeString(
        '😀മAあ韓नेئبअขማঅবাংབོދިεفગુע中رšՀꆈᓄქ',
    ).getGraphemes();

    let mounted = $state(false);
    let previousTime: DOMHighResTimeStamp | undefined = undefined;

    function step(time: DOMHighResTimeStamp) {
        if (previousTime === undefined) previousTime = time;

        const elapsed =
            $animationFactor > 0 ? (time - previousTime) / $animationFactor : 0;
        if (previousTime) {
            for (const character of scene) {
                character.x += character.vx * (elapsed / 1000);
                character.y += character.vy * (elapsed / 1000);
                character.angle += (character.va * (elapsed / 1000)) % 360;

                if (character.x > windowWidth * (1 + bounds))
                    character.x = -windowWidth * bounds;
                if (character.x < -windowWidth * bounds)
                    character.x = windowWidth * (1 + bounds);
                if (character.y > windowHeight * (1 + bounds))
                    character.y = -windowHeight * bounds;
                if (character.y < -windowHeight * bounds)
                    character.y = windowHeight * (1 + bounds);

                const element = document.querySelector(
                    `[data-id="${character.index}"]`,
                );
                if (element instanceof HTMLElement) {
                    element.style.left = `${character.x}px`;
                    element.style.top = `${character.y}px`;
                    element.style.transform = `rotate(${character.angle}deg)`;
                }
            }
        }

        previousTime = time;
        if (mounted && $animationFactor > 0) window.requestAnimationFrame(step);
    }

    onMount(() => {
        mounted = true;
        const random: string[] = [];
        // Compute a number of characters roughly proportional to the window size.
        const count = Math.min(
            20,
            Math.round(windowWidth * windowHeight) / 100000,
        );
        for (let i = 0; i < count; i++)
            random.push(symbols[Math.floor(Math.random() * symbols.length)]);

        scene = random.map((symbol, index) => {
            return {
                symbol,
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

        if (
            typeof window !== 'undefined' &&
            typeof window.requestAnimationFrame !== 'undefined'
        )
            window.requestAnimationFrame(step);

        return () => (mounted = false);
    });
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />

{#if mounted}
    <div class="background" aria-hidden="true">
        {#each scene as character}
            <div
                class="character"
                data-id={character.index}
                style:font-size="{character.size}pt"
                >{withColorEmoji(character.symbol)}<Eyes
                    invert={false}
                    emotion={Emotion.neutral}
                /></div
            >
        {/each}
    </div>
{/if}

<style>
    .background {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: -1;
        overflow: hidden;
    }

    .character {
        font-family: 'Noto Emoji';
        font-size: 48pt;
        position: absolute;
        opacity: 0.05;
        user-select: none;
        color: var(--wordplay-foreground);
    }
</style>
