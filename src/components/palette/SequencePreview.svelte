<script lang="ts">
    import type { SequencePreview } from '@components/palette/sequencePreviews';
    import type { Snippet } from 'svelte';

    interface Props {
        /** The looping animation to play, or undefined for a static icon. */
        preview: SequencePreview | undefined;
        /** True while this option is hovered or focused, so it should animate. */
        active?: boolean;
        /** The option's label. */
        children: Snippet;
    }

    let { preview, active = false, children }: Props = $props();

    let icon = $state<HTMLElement | undefined>(undefined);
    let animation: Animation | undefined;

    // Run the looping animation only while active (hovered or focused), so at most a
    // couple of options animate at once. The effect's cleanup cancels it.
    $effect(() => {
        if (active && icon && preview && preview.keyframes.length > 0) {
            animation = icon.animate(preview.keyframes, {
                duration: preview.duration,
                iterations: Infinity,
            });
            return () => {
                animation?.cancel();
                animation = undefined;
            };
        }
    });
</script>

<span class="preview-row">
    <span class="icon" bind:this={icon} aria-hidden="true">■</span>
    {@render children()}
</span>

<style>
    .preview-row {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    .icon {
        display: inline-block;
        /* A large monochrome square (U+25A0), whose rotation is visible (a circle's isn't). */
        font-size: 1.5em;
        line-height: 1;
        transform-origin: center;
        /* Explicit base color so a color animation has a defined starting value (when a
           pose sets no color, the keyframe omits it and falls back to this). */
        color: var(--wordplay-foreground);
        /* Keep the glyph monochrome even where it has an emoji presentation. */
        font-variant-emoji: text;
        /* Hint the compositor; these are the only properties the preview animates. */
        will-change: transform, opacity, color;
    }
</style>
