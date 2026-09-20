<script lang="ts">
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { type Snippet } from 'svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';

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

<!-- No `for`. It used to be `for=""`, which is not "no association" but a
     broken one: when the attribute is present the browser resolves it to the
     element with that id and stops, so the implicit association from wrapping
     the control never applies. Measured — an input inside `<label for="">` has
     `labels.length === 0`, and inside a bare `<label>` it has 1. Every control
     this widget wrapped was unlabelled by it. -->
<label>
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
