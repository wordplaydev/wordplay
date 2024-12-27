<script lang="ts">
    import { type Snippet } from 'svelte';

    const {
        label,
        column = false,
        children,
        /** A CSS width to apply to the label */
        fixed = '',
    }: {
        label: string;
        column?: boolean;
        children: Snippet;
        fixed?: string;
    } = $props();
</script>

<label for="">
    <span
        class="label"
        class:column
        class:fixed={fixed !== ''}
        style:min-width={fixed}>{label}</span
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

    .column {
        flex-direction: column;
    }

    .fixed {
        display: inline-block;
    }
</style>
