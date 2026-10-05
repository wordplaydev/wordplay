<!--
    The season's figures in the page's margins (#108): rain, snow of the
    reader's own letters, a baking sun, a snowman of round letters — built from
    the season's data in src/seasons/seasons.ts. Decorative only, so hidden from
    screen readers and from the pointer.

    It fills its frame — a positioned box around the page's content — so the
    figures scroll with the page rather than hanging on the viewport, and it
    measures the text column it is given, keeping a gutter between the figures
    and the text. A margin too narrow for a figure shows none, which is a phone.
    At an animation factor of 0 every figure holds a still pose rather than
    disappearing.

    Imported dynamically, so no page graph carries it.
-->
<script lang="ts">
    import { animationFactor, locales } from '#db/Database.ts';
    import { getLogoGlyphForLanguage } from '#components/app/logoGlyph.ts';
    import { withColorEmoji, withMonoEmoji } from '#unicode/emoji.ts';
    import { first } from '#util/nullable.ts';
    import {
        activeElements,
        LocalGlyph,
        type Composition,
        type ElementSpec,
        type Egg,
        type Glyph,
        type Tone,
    } from '#seasons/elements.ts';
    import type { SeasonShown } from '#seasons/Season.ts';
    import { SeasonDesigns } from '#seasons/seasons.ts';
    import { isRegionCode } from '#locale/Regions.ts';

    interface Props {
        shown: SeasonShown;
        /** The text column the figures must stay clear of. */
        column: HTMLElement | undefined;
    }

    let { shown, column }: Props = $props();

    /** How likely a visit is to meet its region's easter egg. */
    const EggChance = 0.25;

    /** A margin narrower than this, in px, is narrow: its figures overhang
     *  the frame's edge and are clipped there, rather than not shown at all. */
    const NarrowMargin = 96;

    /** How far, in rem, a narrow margin's strip reaches past the frame's edge. */
    const Overhang = 0.75;

    /** A margin this wide or wider, in px, holds a season's full density;
     *  narrower ones hold proportionally fewer, down to MinimumDensity. */
    const FullDensityMargin = 160;
    const MinimumDensity = 0.8;

    /** Where a falling figure is in its cycle when it reaches the ground, and
     *  when it starts to fade from where it lies. Matches `@keyframes fall`. */
    const Landed = 0.65;

    /** How many screenfuls above the ground a falling figure may start and
     *  still land there, rather than fading partway down. */
    const LandingReach = 1.5;

    /** Roughly how many px a rem is, to keep a landed figure above the ground. */
    const Rem = 16;

    let layer: HTMLElement | undefined = $state();

    /** The measured margins beside the column, in px, by logical side. */
    let startWidth = $state(0);
    let endWidth = $state(0);
    /** The frame's height, and the viewport's, for density and placement. */
    let height = $state(0);
    let screen = $state(800);
    let rtl = $state(false);

    function measure() {
        const frame = layer?.parentElement;
        if (frame === undefined || frame === null || column === undefined)
            return;
        const outer = frame.getBoundingClientRect();
        const inner = column.getBoundingClientRect();
        rtl = getComputedStyle(frame).direction === 'rtl';
        const left = inner.left - outer.left;
        const right = outer.right - inner.right;
        startWidth = Math.max(0, rtl ? right : left);
        endWidth = Math.max(0, rtl ? left : right);
        height = outer.height;
        screen = window.innerHeight;
    }

    $effect(() => {
        const frame = layer?.parentElement;
        if (frame === undefined || frame === null || column === undefined)
            return;
        measure();
        const observer = new ResizeObserver(() => measure());
        observer.observe(frame);
        observer.observe(column);
        window.addEventListener('resize', measure);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    });

    type Side = 'start' | 'end';

    /**
     * A figure's random draws, made once and kept. Everything about where a
     * figure is comes from these fractions and the current measurements, so a
     * resize moves figures in proportion instead of re-rolling them, which is
     * what made them flicker while a window was being resized.
     */
    type Seed = {
        /** Across its margin, as a fraction; the figure stays wholly inside. */
        across: number;
        /** Down its band of the page, as a fraction. */
        down: number;
        /** A fraction of its element's size range. */
        size: number;
        /** A multiplier on its element's duration, so a crowd isn't in step. */
        pace: number;
        /** How far into its cycle it starts, as a fraction. */
        phase: number;
        /** How far above the ground it comes to rest, in em: a heap, not a line. */
        pile: number;
        /** The angle it settles at, in degrees. */
        turn: number;
    };

    const seeds = new Map<string, Seed>();
    let seeded = '';

    function seedFor(key: string): Seed {
        const existing = seeds.get(key);
        if (existing) return existing;
        const fresh: Seed = {
            across: Math.random(),
            down: Math.random(),
            size: Math.random(),
            pace: 0.85 + Math.random() * 0.3,
            phase: Math.random(),
            pile: Math.random() * 0.6,
            turn: 90 + Math.random() * 180,
        };
        seeds.set(key, fresh);
        return fresh;
    }

    type Figure = {
        key: string;
        composition: Composition;
        motion: ElementSpec['motion'];
        tone: Tone;
        opacity: number;
        side: Side;
        across: number;
        /** Down the page, in px from the frame's top. */
        down: number;
        size: number;
        /** Seconds per cycle. */
        duration: number;
        /** A negative delay, so a crowd starts mid-motion rather than in step. */
        delay: number;
        /** For a falling figure: how far it falls in px, whether that reaches
         *  the ground, and how it lies there. */
        fall: number;
        lands: boolean;
        pile: number;
        turn: number;
    };

    /** What placing a figure needs from an element or an egg. */
    type Placeable = Pick<
        ElementSpec,
        | 'composition'
        | 'motion'
        | 'tone'
        | 'opacity'
        | 'placement'
        | 'size'
        | 'duration'
    >;

    /** Whether this visit meets the region's egg, decided once per session so
     *  it doesn't appear and vanish as the reader moves between pages. */
    function meetsEgg(): boolean {
        try {
            const stored = sessionStorage.getItem('seasonEgg');
            if (stored !== null) return stored === 'yes';
            const meets = Math.random() < EggChance;
            sessionStorage.setItem('seasonEgg', meets ? 'yes' : 'no');
            return meets;
        } catch {
            return false;
        }
    }

    function eggFor(current: SeasonShown): Egg | undefined {
        if (!current.auto || current.region === undefined) return undefined;
        if (!isRegionCode(current.region)) return undefined;
        const egg = SeasonDesigns[current.season].eggs[current.region];
        return egg !== undefined && meetsEgg() ? egg : undefined;
    }

    /** Where a figure starts down the page: the sky is the top of the page,
     *  the ground the bottom of its content, the margins anywhere. Falling
     *  figures may start up to half a screen above the frame, so the top of
     *  the page is never empty while the first ones arrive. */
    function downFor(figure: Placeable, seed: Seed): number {
        const view = Math.min(height, screen);
        if (figure.placement === 'sky') return (0.03 + seed.down * 0.22) * view;
        if (figure.placement === 'ground')
            return Math.max(0, height - (0.08 + seed.down * 0.08) * view);
        return figure.motion === 'fall' || figure.motion === 'pour'
            ? -0.5 * screen + seed.down * (height + 0.5 * screen)
            : seed.down * height;
    }

    /** Where across its strip a figure sits. In a narrow margin, whose strip
     *  reaches past the screen's edge, it keeps away from that outer edge so
     *  it is clipped at most in part, never hidden whole. */
    function acrossIn(side: Side, across: number): number {
        const width = side === 'start' ? startWidth : endWidth;
        if (width >= NarrowMargin) return across;
        // The start strip's outer edge is at 0, the end strip's at 1.
        return side === 'start' ? 0.35 + across * 0.65 : across * 0.65;
    }

    function place(key: string, figure: Placeable, side: Side): Figure {
        const seed = seedFor(key);
        const size =
            figure.size[0] + seed.size * (figure.size[1] - figure.size[0]);
        const down = downFor(figure, seed);
        let duration = figure.duration * seed.pace;
        let fall = 0;
        let lands = false;
        if (figure.motion === 'fall') {
            // A figure near enough the ground falls all the way to it, rests
            // in the heap, and fades; one higher up falls a screenful and
            // fades, so every screen keeps its share rather than the whole
            // crowd collecting at the bottom of a long page. Either way it
            // falls one screenful per its element's duration.
            const toGround = Math.max(0, height - down - size * Rem);
            lands = toGround <= LandingReach * screen;
            fall = lands ? toGround : screen;
            const speed = screen / Math.max(0.1, duration);
            if (lands) duration = Math.max(duration, fall / speed / Landed);
        }
        return {
            key,
            composition: figure.composition,
            motion: figure.motion,
            tone: figure.tone,
            opacity: figure.opacity,
            side,
            across: acrossIn(side, seed.across),
            down,
            size,
            duration,
            delay: -seed.phase * duration,
            fall,
            lands,
            pile: seed.pile,
            turn: seed.turn,
        };
    }

    function figuresFor(current: SeasonShown): Figure[] {
        if (height === 0) return [];
        // New weather, new draws; the same weather keeps its own.
        const weather = `${current.season}/${current.condition ?? ''}`;
        if (weather !== seeded) {
            seeds.clear();
            seeded = weather;
        }
        const design = SeasonDesigns[current.season];
        // Counts are per screenful, so a long page is as weathered as a short
        // one, and thinner where the margins are, so a phone gets a sprinkle.
        const screenfuls = Math.max(1, height / Math.max(1, screen));
        const density = Math.min(
            1,
            Math.max(
                MinimumDensity,
                (startWidth + endWidth) / 2 / FullDensityMargin,
            ),
        );
        const figures: Figure[] = [];
        activeElements(design, current.condition).forEach((element, index) => {
            const copies =
                element.placement === 'margin'
                    ? Math.max(
                          1,
                          Math.round(element.count * screenfuls * density),
                      )
                    : element.count;
            // Sides alternate by copy, offset by element, so a margin's share
            // never depends on how wide the other one is.
            for (let copy = 0; copy < copies; copy++)
                figures.push(
                    place(
                        `${weather}/${element.name}/${copy}`,
                        element,
                        (copy + index) % 2 === 0 ? 'start' : 'end',
                    ),
                );
        });
        const egg = eggFor(current);
        if (egg)
            figures.push(
                place(
                    `${weather}/egg`,
                    {
                        composition: { kind: 'single', glyph: egg.glyph },
                        motion: egg.motion,
                        tone: egg.tone,
                        opacity: 0.5,
                        placement: egg.placement,
                        size: [2, 2.4],
                        duration: 12,
                    },
                    figures.length % 2 === 0 ? 'start' : 'end',
                ),
            );
        return figures;
    }

    let figures = $derived(figuresFor(shown));

    /** Each margin's strip: a wide one is the margin less a gutter; a narrow
     *  one keeps only a small gutter and reaches past the frame's edge, where
     *  the layer clips it, so a phone still sees its season. */
    function strip(width: number): { size: string; offset: string } {
        return width >= NarrowMargin
            ? {
                  size: `calc(${width}px - var(--wordplay-spacing-double))`,
                  offset: '0px',
              }
            : {
                  size: `calc(${width}px - var(--wordplay-spacing-half) + ${Overhang}rem)`,
                  offset: `-${Overhang}rem`,
              };
    }

    const Sides: Side[] = ['start', 'end'];

    /** The reader's own script's exemplar, for `'local'` glyphs. */
    let local = $derived(
        getLogoGlyphForLanguage(first($locales.getLanguages()) ?? 'en'),
    );

    function glyph(value: Glyph, tone: Tone): string {
        const text = value === LocalGlyph ? local : value;
        return tone === 'color' ? withColorEmoji(text) : withMonoEmoji(text);
    }

    let moving = $derived($animationFactor > 0);
</script>

{#snippet drawn(composition: Composition, tone: Tone)}
    {#if composition.kind === 'single'}
        <span class="glyph">{glyph(composition.glyph, tone)}</span>
    {:else if composition.kind === 'radial'}
        <span class="radial">
            {#each { length: composition.count } as _, ray (ray)}
                <span
                    class="ray"
                    style:transform="rotate({(ray * 360) /
                        composition.count}deg) translateY(-0.55em)"
                    >{glyph(composition.glyph, tone)}</span
                >
            {/each}
            {#if composition.center !== undefined}
                <span class="center">{glyph(composition.center, tone)}</span>
            {/if}
        </span>
    {:else if composition.kind === 'stack'}
        <span class="stack">
            {#each composition.glyphs as part, level (level)}
                <span style:font-size="{Math.pow(0.75, level)}em"
                    >{glyph(part, tone)}</span
                >
            {/each}
        </span>
    {:else}
        <span class="row">
            {#each composition.glyphs as part, position (position)}
                <span>{glyph(part, tone)}</span>
            {/each}
        </span>
    {/if}
{/snippet}

<div
    class="season-layer"
    aria-hidden="true"
    data-season={shown.season}
    bind:this={layer}
    style:--viewport="{screen}px"
>
    {#each Sides as side (side)}
        {@const box = strip(side === 'start' ? startWidth : endWidth)}
        <div
            class="margin {side}"
            style:inline-size={box.size}
            style:--offset={box.offset}
        >
            {#each figures.filter((figure) => figure.side === side) as figure (figure.key)}
                <span
                    class="figure tone-{figure.tone} motion-{figure.motion}"
                    class:moving
                    class:lands={figure.lands}
                    style:inset-inline-start="{figure.across * 100}%"
                    style:inset-block-start="{figure.down}px"
                    style:font-size="min({figure.size}rem, max(90cqi, 1.1rem))"
                    style:--shift={rtl ? figure.across : -figure.across}
                    style:--opacity={figure.opacity}
                    style:--duration="{figure.duration}s"
                    style:--delay="{figure.delay}s"
                    style:--fall="{figure.fall}px"
                    style:--pile="{figure.pile}em"
                    style:--turn="{figure.turn}deg"
                    >{@render drawn(figure.composition, figure.tone)}</span
                >
            {/each}
        </div>
    {/each}
</div>

<style>
    /* Fills the frame its page wraps around the content, behind it. */
    .season-layer {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
        overflow: hidden;
    }

    /* Each margin sits against the frame's edge, its inline size measured from
       the column less a gutter, so nothing ever touches the text. */
    .margin {
        position: absolute;
        inset-block: 0;
        container-type: inline-size;
    }

    /* A narrow margin's strip starts past the frame's edge; see strip(). */
    .margin.start {
        inset-inline-start: var(--offset);
    }

    .margin.end {
        inset-inline-end: var(--offset);
    }

    /* Shifted back by the same fraction of its own width that it sits across
       the margin, so a figure at either extreme still lies wholly inside. */
    .figure {
        position: absolute;
        translate: calc(var(--shift) * 100%) 0;
        line-height: 1;
        white-space: nowrap;
        font-family: var(--wordplay-code-font);
        opacity: var(--opacity);
    }

    .tone-foreground {
        color: var(--wordplay-foreground);
    }
    .tone-muted {
        color: var(--wordplay-inactive-color);
    }
    .tone-highlight {
        color: var(--wordplay-highlight-color);
    }
    .tone-link {
        color: var(--wordplay-link-color);
    }
    .tone-blue {
        color: var(--color-blue);
    }
    .tone-purple {
        color: var(--color-purple);
    }
    .tone-pink {
        color: var(--color-pink);
    }
    .tone-orange {
        color: var(--color-orange);
    }

    .radial {
        position: relative;
        display: inline-grid;
        place-items: center;
        inline-size: 1.4em;
        block-size: 1.4em;
    }

    .ray,
    .center {
        grid-area: 1 / 1;
    }

    .ray {
        font-size: 0.45em;
    }

    .stack {
        display: inline-flex;
        flex-direction: column-reverse;
        align-items: center;
        line-height: 0.85;
    }

    .row {
        display: inline-flex;
        gap: 0.1em;
    }

    /* Every motion is a transform or an opacity, never layout, and each runs
       only while moving: at factor 0 the figure keeps its seeded pose. */
    .moving {
        animation-duration: calc(var(--animation-factor, 1) * var(--duration));
        animation-delay: calc(var(--animation-factor, 1) * var(--delay));
        animation-iteration-count: infinite;
        animation-timing-function: linear;
    }

    .moving.motion-fall {
        animation-name: drop;
    }
    .moving.motion-fall.lands {
        animation-name: fall;
    }
    .moving.motion-pour {
        animation-name: pour;
    }
    .moving.motion-drift {
        animation-name: drift;
        animation-direction: alternate;
        animation-timing-function: ease-in-out;
    }
    .moving.motion-rise {
        animation-name: rise;
    }
    .moving.motion-sway {
        animation-name: sway;
        animation-direction: alternate;
        animation-timing-function: ease-in-out;
        transform-origin: bottom center;
    }
    .moving.motion-bob {
        animation-name: bob;
        animation-direction: alternate;
        animation-timing-function: ease-in-out;
    }
    .moving.motion-orbit {
        animation-name: orbit;
    }
    .moving.motion-glow {
        animation-name: glow;
        animation-direction: alternate;
        animation-timing-function: ease-in-out;
    }

    /* A fall tumbles all the way to the ground, rests there a little above it
       so the landed ones heap, and fades before starting again from the top.
       The landing at 65% is `Landed` in the script. */
    @keyframes fall {
        0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
        }
        4% {
            opacity: var(--opacity);
        }
        35% {
            transform: translate(0.6em, calc(var(--fall) * 0.5))
                rotate(calc(var(--turn) * 0.5));
        }
        65% {
            transform: translate(-0.3em, calc(var(--fall) - var(--pile)))
                rotate(var(--turn));
            opacity: var(--opacity);
        }
        90% {
            transform: translate(-0.3em, calc(var(--fall) - var(--pile)))
                rotate(var(--turn));
            opacity: var(--opacity);
        }
        100% {
            transform: translate(-0.3em, calc(var(--fall) - var(--pile)))
                rotate(var(--turn));
            opacity: 0;
        }
    }

    /* A fall from higher up: a screenful's tumble that fades on the way. */
    @keyframes drop {
        0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 0;
        }
        6% {
            opacity: var(--opacity);
        }
        50% {
            transform: translate(0.6em, calc(var(--fall) * 0.5))
                rotate(calc(var(--turn) * 0.5));
        }
        85% {
            opacity: var(--opacity);
        }
        100% {
            transform: translate(-0.3em, var(--fall)) rotate(var(--turn));
            opacity: 0;
        }
    }

    /* Rain falls straight at a slant and never turns. */
    @keyframes pour {
        from {
            transform: translate(0, 0) rotate(12deg);
        }
        to {
            transform: translate(-1.5em, var(--viewport)) rotate(12deg);
        }
    }

    @keyframes drift {
        from {
            transform: translateX(-25cqi);
        }
        to {
            transform: translateX(25cqi);
        }
    }

    @keyframes rise {
        0% {
            transform: translateY(0);
            opacity: 0;
        }
        30% {
            opacity: var(--opacity);
        }
        100% {
            transform: translateY(-6em);
            opacity: 0;
        }
    }

    @keyframes sway {
        from {
            transform: rotate(-8deg);
        }
        to {
            transform: rotate(8deg);
        }
    }

    @keyframes bob {
        from {
            transform: translateY(-0.15em);
        }
        to {
            transform: translateY(0.15em);
        }
    }

    /* A low circle along the horizon that never sets. */
    @keyframes orbit {
        0% {
            transform: translate(-20cqi, 0.8em);
        }
        25% {
            transform: translate(0, 0);
        }
        50% {
            transform: translate(20cqi, 0.8em);
        }
        75% {
            transform: translate(0, 1.4em);
        }
        100% {
            transform: translate(-20cqi, 0.8em);
        }
    }

    /* Slow enough to be far under any flash threshold: one swing takes
       seconds, and it moves between fractions of the figure's own opacity. */
    @keyframes glow {
        from {
            opacity: calc(var(--opacity) * 0.35);
        }
        to {
            opacity: var(--opacity);
        }
    }

    @media print {
        .season-layer {
            display: none;
        }
    }
</style>
