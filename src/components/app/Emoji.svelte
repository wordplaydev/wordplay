<!-- Renders a single emoji/symbol in the Noto emoji font — monochrome by default,
     color when `color` is set. The font is applied only when `text` actually
     contains emoji, so non-emoji content (e.g. "?", "▦") renders in the inherited
     font. For an arbitrary run of text whose emoji should be left to the ambient
     cascade (and whose keycaps need repair), use EmojisRepaired instead. -->
<script lang="ts">
    import { hasEmoji } from '@unicode/emoji';

    interface Props {
        color?: boolean;
        text: string;
    }

    let { color = false, text }: Props = $props();
</script>

{#if hasEmoji(text)}<span class="emoji" class:color>{text}</span
    >{:else}{text}{/if}

<style>
    .emoji {
        font-family: var(--wordplay-emoji-mono-font);
        font-weight: 400;
        font-style: normal;
    }

    .color {
        font-family: var(--wordplay-emoji-color-font);
    }
</style>
