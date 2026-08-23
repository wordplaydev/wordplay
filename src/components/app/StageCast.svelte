<!--
    The floating cast on the landing page's stage: the language's input streams
    and output types drifting behind the logo and bouncing off it.

    This is the landing page's old full-page `Background` rewritten for a bounded
    box. It keeps what that component learned the hard way — element references
    cached so the loop never queries the document, `transform` rather than
    `left`/`top` so moving large glyphs doesn't reflow the page every frame, and
    seeding deferred until `document.fonts.ready` so nothing flashes unstyled —
    and changes three things: the crowd is the share card's cast rather than a
    pool of world scripts, everything is measured against the stage's box rather
    than the viewport, and characters bounce off the lockup at the center instead
    of wrapping around a torus. They also carry no eyes: the old background gave
    every glyph a pair, which is a component instance and a set of styles per
    character for decoration a phone shouldn't be paying for.
-->
<script lang="ts">
    import { animationFactor } from '@db/Database';
    import { withMonoEmoji } from '@unicode/emoji';
    import { untrack } from 'svelte';
    import { pickRandom } from './backgroundUtils';
    import { Cast } from './cast';

    interface Props {
        /** The logo and wordmark the characters bounce off. Measured when it or
         *  the stage resizes — never per frame, which would force layout. */
        lockup?: HTMLElement | undefined;
    }

    let { lockup = undefined }: Props = $props();

    type Character = {
        symbol: string;
        index: number;
        /** The glyph's box, in px: its font size, and its collision extent. */
        size: number;
        x: number;
        y: number;
        angle: number;
        vx: number;
        vy: number;
        va: number;
    };

    type Rect = { x: number; y: number; width: number; height: number };

    let box: HTMLElement | undefined = $state();
    let width = $state(0);
    let height = $state(0);
    let scene: Character[] = $state([]);
    let obstacle: Rect | undefined = $state(undefined);
    let fontsReady = $state(false);

    /** Cached by index so the loop can position characters without a per-frame
     *  `document.querySelector`, which forced layout once per character. */
    const elements: Record<number, HTMLElement> = {};

    let running = false;
    let previousTime: DOMHighResTimeStamp | undefined = undefined;

    /** Roughly one character per this many square px of stage, so a phone gets a
     *  handful where a desktop gets a crowd. */
    const AreaPerCharacter = 25000;
    const MaxCharacters = 14;

    function overlaps(character: Character, rect: Rect): boolean {
        return (
            character.x < rect.x + rect.width &&
            character.x + character.size > rect.x &&
            character.y < rect.y + rect.height &&
            character.y + character.size > rect.y
        );
    }

    /**
     * Push a character out of the lockup along whichever axis it has entered
     * least far, and reflect that velocity component. Resolving the shallower
     * overlap is what makes a glyph that clips a corner glance off it rather
     * than jump to the far side.
     */
    function rebound(character: Character, rect: Rect) {
        const fromLeft = rect.x - (character.x + character.size);
        const fromRight = rect.x + rect.width - character.x;
        const fromTop = rect.y - (character.y + character.size);
        const fromBottom = rect.y + rect.height - character.y;
        const x =
            Math.abs(fromLeft) < Math.abs(fromRight) ? fromLeft : fromRight;
        const y =
            Math.abs(fromTop) < Math.abs(fromBottom) ? fromTop : fromBottom;
        if (Math.abs(x) < Math.abs(y)) {
            character.x += x;
            character.vx =
                x < 0 ? -Math.abs(character.vx) : Math.abs(character.vx);
        } else {
            character.y += y;
            character.vy =
                y < 0 ? -Math.abs(character.vy) : Math.abs(character.vy);
        }
    }

    function step(time: DOMHighResTimeStamp) {
        if (previousTime === undefined) previousTime = time;

        // At factor 0 this is a single frame that only writes the seeded
        // positions: no motion, and below, no request for another frame.
        const elapsed =
            $animationFactor > 0 ? (time - previousTime) / $animationFactor : 0;
        const seconds = elapsed / 1000;

        for (const character of scene) {
            character.x += character.vx * seconds;
            character.y += character.vy * seconds;
            character.angle = (character.angle + character.va * seconds) % 360;

            // The stage's edges contain the cast rather than wrapping it: this
            // is a stage with characters on it, not an infinite field.
            if (character.x < 0) {
                character.x = 0;
                character.vx = Math.abs(character.vx);
            } else if (character.x + character.size > width) {
                character.x = Math.max(0, width - character.size);
                character.vx = -Math.abs(character.vx);
            }
            if (character.y < 0) {
                character.y = 0;
                character.vy = Math.abs(character.vy);
            } else if (character.y + character.size > height) {
                character.y = Math.max(0, height - character.size);
                character.vy = -Math.abs(character.vy);
            }

            if (obstacle !== undefined && overlaps(character, obstacle))
                rebound(character, obstacle);

            const element = elements[character.index];
            if (element)
                element.style.transform = `translate(${character.x}px, ${character.y}px) rotate(${character.angle}deg)`;
        }

        previousTime = time;

        if (running && $animationFactor > 0) window.requestAnimationFrame(step);
        else running = false;
    }

    function start() {
        if (running || scene.length === 0) return;
        running = true;
        previousTime = undefined;
        window.requestAnimationFrame(step);
    }

    /** Where the lockup sits inside this box. Both rects are read once per
     *  resize; the loop only ever reads the cached result. */
    function measure() {
        if (box === undefined || lockup === undefined) {
            obstacle = undefined;
            return;
        }
        const outer = box.getBoundingClientRect();
        const inner = lockup.getBoundingClientRect();
        obstacle = {
            x: inner.x - outer.x,
            y: inner.y - outer.y,
            width: inner.width,
            height: inner.height,
        };
    }

    function seed() {
        const count = Math.max(
            1,
            Math.min(
                MaxCharacters,
                Math.round((width * height) / AreaPerCharacter),
            ),
        );
        // Sized against the stage's shorter side so the crowd stays in
        // proportion to the box rather than to the window.
        const smallest = Math.min(width, height);
        const next: Character[] = [];
        for (let index = 0; index < count; index++) {
            const size = Math.round(smallest * (0.08 + Math.random() * 0.08));
            const character: Character = {
                symbol: pickRandom(Cast),
                index,
                size,
                x: 0,
                y: 0,
                angle: Math.round(Math.random() * 360),
                vx: Math.round(Math.random() * 120 - 60),
                vy: Math.round(Math.random() * 120 - 60),
                va: Math.round(Math.random() * 60 - 30),
            };
            // Start clear of the lockup, so nobody has to be ejected from
            // inside the logo on the first frame.
            for (let attempt = 0; attempt < 12; attempt++) {
                character.x = Math.random() * Math.max(1, width - size);
                character.y = Math.random() * Math.max(1, height - size);
                if (obstacle === undefined || !overlaps(character, obstacle))
                    break;
            }
            next.push(character);
        }
        scene = next;
    }

    $effect(() => {
        if (typeof document === 'undefined') return;
        if (document.fonts?.ready === undefined) {
            fontsReady = true;
            return;
        }
        let alive = true;
        document.fonts.ready.then(() => {
            if (alive) fontsReady = true;
        });
        return () => {
            alive = false;
        };
    });

    /** Seed once the box has a size and the fonts have settled. Later resizes
     *  re-measure the lockup and let the edge rules pull anyone now outside
     *  back in, rather than re-rolling the whole crowd under the reader. */
    $effect(() => {
        if (!fontsReady || width === 0 || height === 0) return;
        untrack(() => {
            if (scene.length === 0) {
                seed();
                measuredWidth = width;
                measuredHeight = height;
            }
            measure();
            start();
        });
    });

    /**
     * Spread the cast across the box's new size, keeping each character where it
     * was in proportion. Without this a window that grows leaves everyone bunched
     * in the corner they were seeded into, since the edge rules only ever pull
     * characters back in — they never push them out.
     */
    function redistribute(fromWidth: number, fromHeight: number) {
        if (fromWidth === 0 || fromHeight === 0) return;
        const x = width / fromWidth;
        const y = height / fromHeight;
        for (const character of scene) {
            character.x *= x;
            character.y *= y;
        }
    }

    let measuredWidth = 0;
    let measuredHeight = 0;

    /** Re-measure when either box changes size, and restart the loop if the
     *  reader turns motion back on. */
    $effect(() => {
        width;
        height;
        lockup;
        $animationFactor;
        untrack(() => {
            redistribute(measuredWidth, measuredHeight);
            measuredWidth = width;
            measuredHeight = height;
            measure();
            if ($animationFactor > 0) start();
            else if (scene.length > 0) {
                // Draw the static frame once, then stop.
                running = false;
                previousTime = undefined;
                window.requestAnimationFrame(step);
            }
        });
    });

    $effect(() => {
        const observer = new ResizeObserver(() => measure());
        if (lockup) observer.observe(lockup);
        if (box) observer.observe(box);
        return () => observer.disconnect();
    });

    $effect(() => {
        return () => {
            running = false;
        };
    });
</script>

<div
    class="cast"
    aria-hidden="true"
    bind:this={box}
    bind:clientWidth={width}
    bind:clientHeight={height}
>
    {#each scene as character (character.index)}
        <div
            class="character"
            bind:this={elements[character.index]}
            style:font-size="{character.size}px"
            >{withMonoEmoji(character.symbol)}</div
        >
    {/each}
</div>

<style>
    .cast {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
        /* The base style is the visible crowd, so at factor 0 it is simply
           there — no fade to sit through. */
        animation: cast-fade-in calc(var(--animation-factor) * 1s) ease-in;
    }

    @keyframes cast-fade-in {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .character {
        font-family: 'Noto Emoji';
        position: absolute;
        /* step() translates from this origin; see there for why it doesn't
           position with left/top. */
        left: 0;
        top: 0;
        /* Full strength. The 0.03 this inherited from the old full-page
           background was right for a wash behind a whole document; on the stage
           these are the cast, and they should read as such. */
        opacity: 1;
        user-select: none;
        color: var(--wordplay-inactive-color);
    }
</style>
