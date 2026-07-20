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
    import { emojiRuns } from '@unicode/emoji';

    interface Props {
        text: string;
        forceColorEmoji?: boolean;
    }

    let { text, forceColorEmoji = false }: Props = $props();

    // The render plan (see emojiRuns): undefined means render `text` as a single
    // bare text node; otherwise ordered runs, each wrapped per its class.
    let runs = $derived(emojiRuns(text, forceColorEmoji));
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
