<!-- The Wordplay logo: a speech bubble whose interior is a tiny stage holding
     one glyph — by default the exemplar of the viewer's dominant script — or
     the circle/triangle/square shapes face on script-neutral surfaces and
     while loading. Decorative by default (aria-hidden); pass a label to make
     it meaningful content. -->
<script lang="ts">
    import { FallbackFontFamilies } from '@basis/faces/FallbackFonts';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { hasEmoji } from '@unicode/emoji';
    import { getLogoGlyphForLanguage } from './logoGlyph';
    import {
        LOGO_BUBBLE_PATH,
        LOGO_CENTER_X,
        LOGO_CENTER_Y,
        LOGO_GLYPH_ROTATION,
        LOGO_GLYPH_SIZE,
        LOGO_MAX_GLYPH_SCALE,
        LOGO_SHAPE_CIRCLE,
        LOGO_SHAPE_LINE_Y,
        LOGO_SHAPE_SQUARE,
        LOGO_SHAPE_TRIANGLE,
        LOGO_STROKE_WIDTH,
        LOGO_TARGET_INK_HEIGHT,
        LOGO_TARGET_INK_WIDTH,
        LOGO_VIEWBOX,
    } from './logoMark';

    interface Props {
        /** What the bubble says: a glyph, or the shapes face. */
        variant?: 'glyph' | 'shapes';
        /** Override the glyph; defaults to the exemplar of the viewer's
         *  primary locale's dominant script. */
        glyph?: string | undefined;
        /** Rendered width/height, any CSS length; 1em scales with text. */
        size?: string;
        /** When set, the mark is content: role="img" with this label in the
         *  primary locale. When unset, it's decorative and hidden from
         *  assistive tech — required where it sits inside the wordmark
         *  heading, whose accessible name must stay exactly "Wordplay". */
        label?: LocaleTextAccessor | undefined;
        /** Whether the shapes do their loading wave (no-op at animation
         *  factor 0). */
        pulse?: boolean;
    }

    let {
        variant = 'glyph',
        glyph = undefined,
        size = '1em',
        label = undefined,
        pulse = true,
    }: Props = $props();

    const shownGlyph = $derived(
        glyph ?? getLogoGlyphForLanguage($locales.getLanguages()[0]),
    );

    // Glyphs are fitted to the bubble by their ink box, not their em box —
    // baseline placement leaves x-height letters like a, α, and ع sitting
    // low and small. SVG's getBBox can't measure this (it reports the line
    // box, ascent to descent, in every engine), so each glyph is measured
    // with canvas TextMetrics' actualBoundingBox* — tight ink bounds, the
    // same canvas-measurement route Stage.ts uses. The glyph is enlarged
    // until its ink fills the bubble like a tall glyph does (capped, so
    // stems stay near the bubble's stroke weight) and its ink center is
    // translated onto the bubble's center. Re-measured when a lazy fallback
    // face arrives, since metrics change with the font.
    let glyphSize = $state(LOGO_GLYPH_SIZE);
    let inkX = $state(0);
    let inkY = $state(0);

    const emoji = $derived(hasEmoji(shownGlyph));

    function measure(glyph: string, emojiFace: boolean) {
        const context = document.createElement('canvas').getContext('2d');
        if (context === null) return;
        // The same faces the SVG text uses below; canvas font strings can't
        // resolve CSS variables, so the literal family list is used, the way
        // Stage.ts measures Phrases.
        context.font = emojiFace
            ? `400 ${LOGO_GLYPH_SIZE}px "Noto Emoji", "Noto Sans"`
            : `400 ${LOGO_GLYPH_SIZE}px "Noto Sans", ${FallbackFontFamilies}, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'alphabetic';
        const metrics = context.measureText(glyph);
        const height =
            metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
        const width =
            metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        if (height <= 0 || width <= 0) return;
        const scale = Math.max(
            1,
            Math.min(
                LOGO_TARGET_INK_HEIGHT / height,
                LOGO_TARGET_INK_WIDTH / width,
                LOGO_MAX_GLYPH_SCALE,
            ),
        );
        glyphSize = LOGO_GLYPH_SIZE * scale;
        // The text element sits with its baseline on the bubble's center
        // line and its anchor on the center; shift so the ink's center lands
        // there instead. Ink center relative to the baseline/anchor:
        // ((descent − ascent) / 2, (right − left) / 2), scaled with the glyph.
        inkY =
            ((metrics.actualBoundingBoxAscent -
                metrics.actualBoundingBoxDescent) /
                2) *
            scale;
        inkX =
            ((metrics.actualBoundingBoxLeft - metrics.actualBoundingBoxRight) /
                2) *
            scale;
    }

    $effect(() => {
        const glyph = shownGlyph;
        const emojiFace = emoji;
        let alive = true;
        const remeasure = () => {
            if (alive) measure(glyph, emojiFace);
        };
        remeasure();
        document.fonts.ready.then(remeasure);
        document.fonts.addEventListener('loadingdone', remeasure);
        return () => {
            alive = false;
            document.fonts.removeEventListener('loadingdone', remeasure);
        };
    });
</script>

<svg
    viewBox={LOGO_VIEWBOX}
    style:width={size}
    style:height={size}
    role={label !== undefined ? 'img' : undefined}
    aria-label={label !== undefined
        ? $locales.getPrimaryPlainText(label)
        : undefined}
    aria-hidden={label === undefined ? 'true' : undefined}
>
    <path
        class="bubble"
        class:throb={variant === 'shapes' && pulse}
        d={LOGO_BUBBLE_PATH}
        fill="none"
        stroke="currentColor"
        stroke-width={LOGO_STROKE_WIDTH}
        stroke-linejoin="round"
        stroke-linecap="round"
    />
    {#if variant === 'shapes'}
        <!-- All three sit on an invisible line through the bubble's center,
             tilted at the glyph angle by this group: the circle centered on
             the line, the triangle's base on it, the square hanging from it. -->
        <g
            fill="currentColor"
            transform="rotate({LOGO_GLYPH_ROTATION} {LOGO_CENTER_X} {LOGO_CENTER_Y})"
        >
            <circle
                class="shape"
                class:wave={pulse}
                cx={LOGO_SHAPE_CIRCLE.cx}
                cy={LOGO_SHAPE_LINE_Y}
                r={LOGO_SHAPE_CIRCLE.r}
            />
            <polygon
                class="shape"
                class:wave={pulse}
                points="{LOGO_SHAPE_TRIANGLE.left},{LOGO_SHAPE_LINE_Y} {LOGO_SHAPE_TRIANGLE.right},{LOGO_SHAPE_LINE_Y} {LOGO_SHAPE_TRIANGLE.apexX},{LOGO_SHAPE_TRIANGLE.apexY}"
                style:animation-delay="calc(var(--animation-factor) * 0.16s)"
            />
            <rect
                class="shape"
                class:wave={pulse}
                x={LOGO_SHAPE_SQUARE.x}
                y={LOGO_SHAPE_SQUARE.top}
                width={LOGO_SHAPE_SQUARE.side}
                height={LOGO_SHAPE_SQUARE.side}
                style:animation-delay="calc(var(--animation-factor) * 0.32s)"
            />
        </g>
    {:else}
        <text
            class="glyph"
            class:emoji
            x={LOGO_CENTER_X}
            y={LOGO_CENTER_Y}
            transform="rotate({LOGO_GLYPH_ROTATION} {LOGO_CENTER_X} {LOGO_CENTER_Y}) translate({inkX} {inkY})"
            font-size={glyphSize}>{shownGlyph}</text
        >
    {/if}
</svg>

<style>
    svg {
        display: inline-block;
        /* Sit on the text baseline like the glyph it is (with a slight
           descender, like an emoji), rather than vertical-align: middle,
           which centers on the x-height midline and rides visibly low next
           to baseline-aligned neighbors (e.g. the footer nav emoji). */
        vertical-align: -0.15em;
    }

    .glyph {
        /* Pinned to the Noto family by design (the mark must not drift with
           --wordplay-app-font); non-Latin glyphs resolve to their per-script
           Noto fallback face. Regular weight: the bubble's stroke is matched
           to Noto Sans 400's stems so bubble and glyph read as one font.
           No dominant-baseline: vertical placement is the measured ink
           offset in the transform, which is engine-independent. */
        font-family: 'Noto Sans', var(--wordplay-fallback-fonts), sans-serif;
        font-weight: 400;
        text-anchor: middle;
        fill: currentColor;
    }

    .glyph.emoji {
        /* The monochrome emoji face matches the outlined mark; Noto Emoji has
           no bold weight. */
        font-family: var(--wordplay-emoji-mono-font);
        font-weight: 400;
    }

    /* The base styles are the complete resting mark: multiplying the
       durations by --animation-factor makes both animations a no-op at
       factor 0 (reduced motion), leaving a still bubble with all three
       shapes in place, matching the convention in Spinning.svelte. */

    /* Loading as a crowd doing the wave: each shape hops in turn, by
       position rather than opacity so the face never fades. The CSS
       translate composes with the group's tilt, so the hop travels along
       the tilted alignment line's normal. */
    .shape.wave {
        animation: wave infinite ease-in-out;
        animation-duration: calc(var(--animation-factor) * 1.3s);
    }

    /* A gentle throb of the whole bubble while loading, for visibility at
       small sizes. */
    .bubble.throb {
        transform-box: fill-box;
        transform-origin: center;
        animation: throb infinite ease-in-out;
        animation-duration: calc(var(--animation-factor) * 1.3s);
    }

    @keyframes wave {
        0%,
        50%,
        100% {
            translate: 0 0;
        }
        20% {
            translate: 0 -5px;
        }
    }

    @keyframes throb {
        0%,
        100% {
            transform: scale(1);
        }
        40% {
            transform: scale(1.06);
        }
    }
</style>
