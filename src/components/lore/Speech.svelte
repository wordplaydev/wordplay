<script lang="ts">
    import type Glyph from '../../lore/Glyph';

    export let glyph: Glyph;

    const Limit = 10;
</script>

<div class="dialog">
    {#key glyph}
        <div class="glyphs emotion-{glyph.emotion}">
            {glyph.symbols.length > Limit
                ? `${glyph.symbols.substring(0, Limit)}…`
                : glyph.symbols}
        </div>
    {/key}
    <div class="message">
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

    .glyphs {
        display: inline-block;
        font-size: 2em;
        max-width: 2em;
        flex-shrink: 0;
        word-break: break-all;
        line-height: 100%;
        text-align: center;
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

        --tail-width: 10px;
    }

    .message:after {
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

    .message:before {
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
        left: calc(-1 * (var(--tail-width) + 2 * var(--wordplay-border-width)));
        top: 50%;
    }

    .emotion-cheerful {
        animation: cheerful 0.2s ease-out 3;
    }

    @keyframes cheerful {
        0%,
        100% {
            transform: scaleY(0.9) rotate(5deg);
        }
        10% {
            transform: scaleY(1.3) rotate(-5deg);
        }
    }
</style>
