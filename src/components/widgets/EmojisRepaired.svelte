<!-- Renders an arbitrary run of text, repairing the keycap (2️⃣) and legacy color
     symbols (©️) that would otherwise render broken because their base codepoints
     were dropped from the general emoji-font ranges (see static/fonts.css). Those
     runs are wrapped in the dedicated 'Noto Emoji Keycap' font; everything else —
     plain text and ordinary emoji alike — is left untouched for the ambient font
     cascade to render (honoring a creator's chosen face on the stage). Text with
     no such sequence renders as a single bare text node (no segmentation, no
     wrapper), so the common case stays cheap and the editor's caret measurement
     is unaffected. To force a known glyph into the emoji font, use Emoji instead. -->
<script lang="ts">
    import { hasColorCombo, segmentColorEmoji } from '@unicode/emoji';

    interface Props {
        text: string;
    }

    let { text }: Props = $props();

    // Only segment when there's actually a keycap/legacy sequence to repair;
    // otherwise leave `runs` undefined and render the text directly below.
    let runs = $derived(
        hasColorCombo(text) ? segmentColorEmoji(text) : undefined,
    );
</script>

{#if runs}{#each runs as run}{#if run.emoji}<span class="emoji-keycap"
                >{run.text}</span
            >{:else}{run.text}{/if}{/each}{:else}{text}{/if}

<style>
    .emoji-keycap {
        font-family: var(--wordplay-emoji-color-font);
    }
</style>
