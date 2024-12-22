<script lang="ts">
    import { type Snippet } from 'svelte';

    const { label, children }: { label: string; children: Snippet } = $props();
</script>

<label for="">
    <span class="label">{label}</span>
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
</style>
