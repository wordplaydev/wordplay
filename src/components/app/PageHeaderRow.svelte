<script lang="ts">
    import type { Crumb } from '@components/app/getBreadcrumbs';
    import PageHeader from '@components/app/PageHeader.svelte';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import type { Snippet } from 'svelte';

    interface Props {
        /** Passthrough to PageHeader/Breadcrumbs. */
        name?: string | undefined;
        extra?: Crumb[] | undefined;
        header?: LocaleTextAccessor;
        block?: boolean;
        wrap?: boolean;
        description?: LocaleTextsAccessor;
        /** Page controls rendered to the right of the header. They wrap to
         * below the header on narrow viewports. */
        controls?: Snippet;
    }

    let { name, extra, header, block, wrap, description, controls }: Props =
        $props();
</script>

<div class="page-header-row">
    <PageHeader {name} {extra} {header} {block} {wrap} {description} />
    {@render controls?.()}
</div>

<style>
    /* The header sits at the inline start; the controls sit at the inline end,
       and wrap to their own line below the header when the two no longer fit
       side by side. */
    .page-header-row {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        /* Sit the controls at the bottom of the header, since they relate to
           the content below it. */
        align-items: end;
        justify-content: space-between;
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding-bottom: var(--wordplay-spacing);
    }
</style>
