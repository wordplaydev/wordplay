<script lang="ts">
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    import LocalizedText from './LocalizedText.svelte';

    const {
        label,
        column = false,
        children,
        /** A CSS width to apply to the label */
        fixed = '',
    }: {
        label: LocaleTextAccessor;
        column?: boolean;
        children: Snippet;
        fixed?: string | undefined;
    } = $props();
</script>

<label for="">
    <span
        class="label"
        class:column
        class:fixed={fixed !== ''}
        style:min-width={fixed}><LocalizedText path={label} /></span
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
