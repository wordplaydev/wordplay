<script lang="ts">
    import { type Snippet } from 'svelte';

    const {
        label,
        children,
        /** A CSS width to apply to the label */
        fixed = '',
    }: { label: string; children: Snippet; fixed?: string } = $props();
</script>

<label for="">
    <span class="label" class:fixed={fixed !== ''} style:min-width={fixed}
        >{label}</span
    >
    {@render children()}
</label>

<style>
    label {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    label .label {
        font-style: italic;
        font-size: var(--wordplay-small-font-size);
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .fixed {
        display: inline-block;
    }
</style>
