<script lang="ts">
    import type Concept from '../../concepts/Concept';
    import type Glyph from '../../lore/Glyph';
    import { preferredTranslations } from '../../translation/translations';
    import ConceptLinkUI from '../concepts/ConceptLinkUI.svelte';

    export let glyph: Glyph;
    export let below: boolean = false;
    export let concept: Concept | undefined = undefined;

    const Limit = 10;
    $: symbols =
        glyph.symbols.length > Limit
            ? `${glyph.symbols.substring(0, Limit)}…`
            : glyph.symbols;
</script>

<div class="dialog {below ? 'column' : 'row'}">
    {#key glyph}
        <div
            class="glyphs emotion-{concept?.getEmotion(
                $preferredTranslations[0]
            )}"
        >
            {#if concept}
                <ConceptLinkUI link={concept} salient={false} label={symbols} />
            {:else}
                {symbols}
            {/if}
        </div>
    {/key}
    <div class="message {below ? 'below' : 'right'}">
        <slot />
    </div>
</div>

<style>
    .dialog {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .dialog.column {
        flex-direction: column;
    }

    .glyphs {
        display: inline-block;
        line-height: 100%;
        font-family: var(--wordplay-code-font);
    }

    :global(:not(.animated)) {
        animation-duration: 0s;
    }

    .row .glyphs {
        font-size: 1em;
        max-width: 4em;
        flex-shrink: 0;
        text-align: center;
        word-break: break-all;
    }

    .column .glyphs {
        font-size: 2em;
        text-align: left;
        width: 100%;
    }

    .message {
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: calc(2 * var(--wordplay-border-radius));
        padding: var(--wordplay-spacing);
        align-self: stretch;
        word-break: break-word;
        position: relative;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        text-align: left;
        flex-grow: 1;
        position: relative;
        --tail-width: 0.25em;
    }

    .message.right {
        margin-left: var(--tail-width);
    }

    .message.below {
        margin-top: var(--tail-width);
    }

    .message.right:after {
        content: '';
        position: absolute;
        border-style: solid;
        border-width: var(--tail-width) var(--tail-width) var(--tail-width) 0;
        border-color: transparent var(--wordplay-background);
        display: block;
        width: 0;
        z-index: 1;
        margin-top: calc(-1 * var(--tail-width));
        left: calc(-1 * var(--tail-width));
        top: 50%;
    }

    .message.right:before {
        content: '';
        position: absolute;
        border-style: solid;
        border-width: calc(var(--tail-width) + var(--wordplay-border-width))
            calc(var(--tail-width) + var(--wordplay-border-width))
            calc(var(--tail-width) + var(--wordplay-border-width)) 0;
        border-color: transparent var(--wordplay-border-color);
        display: block;
        width: 0;
        z-index: 0;
        margin-top: calc(
            -1 * (var(--tail-width) + var(--wordplay-border-width))
        );
        left: calc(-1 * (var(--tail-width) + 1 * var(--wordplay-border-width)));
        top: 50%;
    }

    .message.below:after {
        content: '';
        position: absolute;
        border-style: solid;
        border-width: 0 var(--tail-width) var(--tail-width);
        border-color: var(--wordplay-background) transparent;
        display: block;
        width: 0;
        z-index: 1;
        top: calc(-1 * var(--tail-width));
        left: calc(2 * var(--tail-width));
    }

    .message.below:before {
        content: '';
        position: absolute;
        border-style: solid;
        border-width: 0 calc(var(--tail-width) + var(--wordplay-border-width))
            calc(var(--tail-width) + var(--wordplay-border-width));
        border-color: var(--wordplay-border-color) transparent;
        display: block;
        width: 0;
        z-index: 0;
        top: calc(-1 * (var(--tail-width) + var(--wordplay-border-width)));
        left: calc(2 * var(--tail-width) - 1 * var(--wordplay-border-width));
    }

    .emotion-kind {
        animation: kind ease 1;
        animation-duration: 0.5s;
        transform-origin: bottom;
    }

    @keyframes kind {
        0% {
            transform: rotate(3deg);
            transform-origin: bottom;
        }
        30% {
            transform: rotate(-3deg);
            transform-origin: bottom;
        }
        100% {
            transform: rotate(7deg) scaleY(0.9) translateX(0.1em);
            transform-origin: bottom;
        }
    }

    .emotion-serious {
        animation: serious ease 3;
        animation-duration: 0.25s;
        transform-origin: bottom;
    }

    @keyframes serious {
        0% {
            transform: scaleY(1);
        }
        10%,
        90% {
            transform: scaleY(0.5);
        }
        100% {
            transform: scaleY(1);
        }
    }

    .emotion-cheerful {
        animation: cheerful ease 3;
        animation-duration: 0.25s;
        transform-origin: bottom;
        --cheerfulness: 1deg;
    }

    @keyframes cheerful {
        0%,
        100% {
            transform: rotate(calc(-1 * var(--cheerfulness)))
                skewX(calc(-1 * var(--cheerfulness))) translateX(-10px);
        }
        50% {
            transform: rotate(var(--cheerfulness)) skewX(var(--cheerfulness))
                translateX(10px);
        }
    }
</style>
