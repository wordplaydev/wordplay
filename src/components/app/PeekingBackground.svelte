<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { animationFactor } from '@db/Database';
    import { Emotion } from '../../lore/Emotion';
    import { withColorEmoji } from '@unicode/emoji';
    import Eyes from '@components/lore/Eyes.svelte';
    import { pickRandom } from './backgroundUtils';

    interface Props {
        /** The pool of glyphs to peek (e.g. the tutorial character cast). */
        symbols: string[];
        /** How long a character stays peeking (and blinking) before retreating, in ms. */
        holdMs?: number;
        /** Pause between one character retreating and the next peeking, in ms. */
        gapMs?: number;
        /** Character size, in points. */
        size?: number;
    }

    let { symbols, holdMs = 3200, gapMs = 1800, size = 128 }: Props = $props();

    // Measured size of the background area, so characters peek from its edges.
    let width = $state(0);
    let height = $state(0);
    let mounted = $state(false);

    // The current peeker's symbol, anchor on an edge, and rotation.
    let symbol = $state('');
    let left = $state(0);
    let top = $state(0);
    let angle = $state(0);
    let peeking = $state(false);
    /** When true, the move is applied without a transition (used to reposition between peeks). */
    let instant = $state(false);

    // The slide transition duration; kept in sync with the CSS so timers line up.
    const SLIDE_MS = 600;

    let alive = false;
    let timers: ReturnType<typeof setTimeout>[] = [];
    function later(fn: () => void, ms: number) {
        timers.push(setTimeout(fn, ms));
    }
    function clearTimers() {
        for (const id of timers) clearTimeout(id);
        timers = [];
    }

    /** Pick a random edge anchor and a rotation so the glyph's top (its eyes) faces the center. */
    function placement() {
        const cx = width / 2;
        const cy = height / 2;
        const along = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
        const edge = Math.floor(Math.random() * 4);
        let ax: number;
        let ay: number;
        if (edge === 0) {
            ax = along(0.15 * width, 0.85 * width);
            ay = 0;
        } else if (edge === 1) {
            ax = width;
            ay = along(0.15 * height, 0.85 * height);
        } else if (edge === 2) {
            ax = along(0.15 * width, 0.85 * width);
            ay = height;
        } else {
            ax = 0;
            ay = along(0.15 * height, 0.85 * height);
        }
        // Eyes sit at the glyph's top; rotate so "up" points at the center (+90°), plus a little
        // variance so each peek comes in at a different angle — but always toward the center.
        const theta =
            (Math.atan2(cy - ay, cx - ax) * 180) / Math.PI +
            90 +
            (Math.random() * 40 - 20);
        return { ax, ay, theta };
    }

    async function cycle() {
        if (!alive || !mounted || symbols.length === 0) return;
        // Wait for the area to be measured before placing anything.
        if (width === 0 || height === 0) {
            later(cycle, 100);
            return;
        }

        const { ax, ay, theta } = placement();
        symbol = pickRandom(symbols);
        left = ax;
        top = ay;
        angle = theta;

        // Reduced motion: show a single static peeker and stop (no sliding, no cycling).
        if ($animationFactor === 0) {
            instant = true;
            peeking = true;
            return;
        }

        // Jump (no transition) to the hidden position at the new spot, then slide in.
        instant = true;
        peeking = false;
        await tick();
        requestAnimationFrame(() => {
            if (!alive) return;
            instant = false;
            peeking = true;
            // Hold while the eyes blink, then retreat and, after a gap, peek the next character.
            later(() => {
                if (!alive) return;
                peeking = false;
                later(cycle, SLIDE_MS + gapMs);
            }, holdMs);
        });
    }

    onMount(() => {
        alive = true;
        const start = () => {
            if (!alive) return;
            mounted = true;
            cycle();
        };
        // Wait for fonts so emoji don't flash unstyled (matches Background).
        if (typeof document !== 'undefined' && document.fonts?.ready)
            document.fonts.ready.then(start);
        else start();
        return () => {
            alive = false;
            mounted = false;
            clearTimers();
        };
    });

    // Local +Y points away from the center (the top faces the center), so the hidden position is a
    // large outward offset; the peek pulls inward (negative) far enough to reveal ~80% of the glyph.
    let offset = $derived(peeking ? -size * 0.62 : size * 1.25);
</script>

<div
    class="peeking-background"
    aria-hidden="true"
    bind:clientWidth={width}
    bind:clientHeight={height}
>
    {#if mounted && symbols.length > 0}
        <div
            class="peeker"
            class:instant
            style:left="{left}px"
            style:top="{top}px"
            style:font-size="{size}pt"
            style:transform="translate(-50%, -50%) rotate({angle}deg) translateY({offset}px)"
            >{withColorEmoji(symbol)}<Eyes
                invert={false}
                emotion={Emotion.neutral}
            /></div
        >
    {/if}
</div>

<style>
    .peeking-background {
        position: absolute;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        pointer-events: none;
    }

    .peeker {
        position: absolute;
        /* Matches how tutorial characters render elsewhere: text symbols stay crisp, while emoji
           fall through to Noto Color Emoji (in color, since this is a full-opacity foreground). */
        font-family: var(--wordplay-code-font);
        user-select: none;
        color: var(--wordplay-foreground);
        transition: transform calc(var(--animation-factor, 1) * 600ms) ease-in-out;
        will-change: transform;
    }

    .peeker.instant {
        transition: none;
    }
</style>
