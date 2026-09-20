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
        control = undefined,
    }: {
        label: LocaleTextAccessor;
        column?: boolean;
        children: Snippet;
        fixed?: string | undefined;
        /**
         * The `id` of the one control this labels, which makes this a real
         * `<label for>`.
         *
         * Without it this labels a *group* instead, and that distinction is the
         * whole reason the prop exists. A `<label>` with no `for` associates
         * with its first labelable descendant — and a `<button>` is labelable —
         * so wrapping anything built from buttons, a `Mode`'s radios above all,
         * handed the first one the label's entire text as its accessible name:
         * "add as" became "add as add as add the symbol as pixels…". It was
         * `for=""` before, which associates with nothing at all and left every
         * control here unlabelled; neither is right, and which one applies
         * depends on what the caller wrapped.
         */
        control?: string | undefined;
    } = $props();

    const uid = $props.id();
    const labelID = `${uid}-label`;
</script>

{#snippet content()}
    <span
        class="label"
        class:column
        class:fixed={fixed !== ''}
        style:min-width={fixed}
        id={control === undefined ? labelID : undefined}
        ><LocalizedText path={label} /></span
    >
    {@render children()}
{/snippet}

{#if control === undefined}
    <div class="labeled" role="group" aria-labelledby={labelID}>
        {@render content()}
    </div>
{:else}
    <label class="labeled" for={control}>{@render content()}</label>
{/if}

<style>
    .labeled {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .labeled .label {
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
