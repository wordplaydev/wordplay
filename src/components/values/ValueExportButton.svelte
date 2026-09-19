<script lang="ts">
    /**
     * The affordance that opens the export dialog, for surfaces that render a
     * value themselves.
     *
     * Rendered only when `canExport` says there is something worth a file, so
     * an inactive button never appears. That test is O(1) by design — see
     * `canExport.ts` — because this sits under a value that re-renders on every
     * evaluation.
     *
     * **The dialog is imported dynamically**, and that is load-bearing rather
     * than tidy: this button hangs off `OutputView`, which is on the import
     * graph of every page that renders a project preview, and the dialog pulls
     * in the serializers for every value type. A static import put the
     * galleries page over its budget (`importGraph.test.ts`).
     *
     * Deliberately not placed inside `ValueView`: documentation examples, the
     * palette and markup all render values through it, and none of them wants a
     * save button on every example on the page.
     */
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type Project from '@db/projects/Project';
    import { canExport } from '@values/export/canExport';
    import type Value from '@values/Value';
    import type { Component } from 'svelte';

    interface Props {
        value: Value;
        project: Project;
    }

    let { value, project }: Props = $props();

    let show = $state(false);

    let possible = $derived(canExport(value));

    /** Loaded on first press, so nothing about serializing a value reaches a
     *  page that only ever shows one. */
    let Dialog:
        | Component<{
              value: Value;
              project: Project;
              show?: boolean;
              onclose?: () => void;
          }>
        | undefined = $state(undefined);

    async function open() {
        Dialog ??= (await import('@components/values/ValueExportDialog.svelte'))
            .default;
        show = true;
    }
</script>

{#if possible}
    <div class="export">
        <Button
            background
            tip={(l) => l.ui.export.label}
            action={open}
            testid="export-value"
        >
            <LocalizedText path={(l) => l.ui.export.label} /></Button
        >
    </div>
    {#if Dialog}
        <Dialog {value} {project} bind:show />
    {/if}
{/if}

<style>
    .export {
        margin-block-start: var(--wordplay-spacing);
    }
</style>
