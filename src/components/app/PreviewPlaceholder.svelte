<!-- Holds a preview tile's exact box while its content loads (or when there's
     nothing to show), so lists of previews don't shift as they resolve. -->
<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';

    interface Props {
        /** How many rems the square should be; mirrors ProjectPreview's `size`. */
        size?: number;
        /** Whether anything is coming. False renders an empty dashed box. */
        loading?: boolean;
    }

    let { size = 6, loading = true }: Props = $props();
</script>

<div class="placeholder" style:width={`${size}rem`} style:height={`${size}rem`}>
    {#if loading}<Spinning label={(l) => l.ui.widget.loading.message} />{/if}
</div>

<style>
    /* Mirrors ProjectPreview's .preview border, but dashed, to convey that
       there's nothing to show yet without changing the surrounding layout. */
    .placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        aspect-ratio: 1 / 1;
        border: var(--wordplay-border-color) dashed var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }
</style>
