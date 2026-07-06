<!-- Renders an arbitrary run of text, repairing the keycap (2️⃣) and legacy color
     symbols (©️) that would otherwise render broken because their base codepoints
     were dropped from the general emoji-font ranges (see static/fonts/fonts.css). Those
     runs are wrapped in the dedicated 'Noto Emoji Keycap' font; everything else —
     plain text and ordinary emoji alike — is left untouched for the ambient font
     cascade to render (honoring a creator's chosen face on the stage). Text with
     no such sequence renders as a single bare text node (no segmentation, no
     wrapper), so the common case stays cheap and the editor's caret measurement
     is unaffected. To force a known glyph into the emoji font, use Emoji instead.

     `forceColorEmoji` (the editor) additionally wraps EVERY emoji, because the
     editor's token font is monospace and won't render color emoji. Ordinary emoji
     get the Noto-Color-Emoji-first --wordplay-emoji-color-font; keycap/legacy runs
     get the keycap face (--wordplay-emoji-keycap-font). They must NOT share one
     stack: Safari won't fall through a stack led by the OT-SVG keycap face and
     drops to the system Apple emoji. The stage leaves forceColorEmoji off so
     ordinary emoji keep honoring the creator's chosen face. -->
<script lang="ts">
    import {
        hasColorCombo,
        hasEmoji,
        segmentColorEmoji,
        segmentEmoji,
        withoutVariationSelectors,
    } from '@unicode/emoji';

    interface Props {
        text: string;
        forceColorEmoji?: boolean;
    }

    let { text, forceColorEmoji = false }: Props = $props();

    // Normalize both segmenters to { text, cls } runs, where cls is the wrapper
    // class (or undefined for a bare text node). Only segment when there's
    // something to wrap; otherwise leave `runs` undefined and render text
    // directly. In the editor (forceColorEmoji) every emoji is wrapped — ordinary
    // emoji in .emoji-color, keycap/legacy in .emoji-keycap; elsewhere just the
    // keycap/legacy combos.
    let runs = $derived.by(() => {
        if (forceColorEmoji) {
            if (!hasEmoji(text)) return undefined;
            return segmentEmoji(text).map((run) => ({
                // Strip the variation selector from ordinary emoji. The
                // .emoji-color wrapper already forces the color font, and a
                // trailing U+FE0F makes Safari prefer the SYSTEM (Apple) emoji
                // over the web color font even when it covers the sequence — the
                // stage renders these bare and gets Noto Color, so we match it.
                // Keycap/legacy runs keep their sequence (the keycap ligature
                // shapes digit + U+20E3 and legacy color needs U+FE0F).
                text:
                    run.kind === 'emoji'
                        ? withoutVariationSelectors(run.text)
                        : run.text,
                cls:
                    run.kind === 'keycap'
                        ? 'emoji-keycap'
                        : run.kind === 'emoji'
                          ? 'emoji-color'
                          : undefined,
            }));
        }
        if (!hasColorCombo(text)) return undefined;
        return segmentColorEmoji(text).map((run) => ({
            text: run.text,
            cls: run.emoji ? 'emoji-keycap' : undefined,
        }));
    });
</script>

{#if runs}{#each runs as run}{#if run.cls === 'emoji-keycap'}<span
                class="emoji-keycap">{run.text}</span
            >{:else if run.cls === 'emoji-color'}<span class="emoji-color"
                >{run.text}</span
            >{:else}{run.text}{/if}{/each}{:else}{text}{/if}

<style>
    .emoji-keycap {
        font-family: var(--wordplay-emoji-keycap-font);
    }
    .emoji-color {
        font-family: var(--wordplay-emoji-color-font);
    }
</style>
