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
        /** Optional controls rendered inline at the end of the breadcrumb row. */
        breadcrumbControls?: Snippet;
        /** Passthrough to PageHeader: whether to render the breadcrumb trail
         *  above the header. */
        breadcrumbs?: boolean;
        /** Whether to rule off the header from what follows. Off for pages whose
         *  content already draws its own separator right below — a tab bar, say —
         *  where a second line is redundant. */
        divider?: boolean;
        /** Whether the controls sit right after the header instead of at the
         *  inline end. Use when they're small and belong with the title, rather
         *  than being page tools that read better anchored to the far edge. */
        packControls?: boolean;
    }

    let {
        name,
        extra,
        header,
        block,
        wrap,
        description,
        controls,
        breadcrumbControls,
        breadcrumbs = true,
        divider = true,
        packControls = false,
    }: Props = $props();
</script>

<div class="page-header-row" class:divider class:pack={packControls}>
    <PageHeader
        {name}
        {extra}
        {header}
        {block}
        {wrap}
        {description}
        {breadcrumbControls}
        {breadcrumbs}
    />
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
    }

    .divider {
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
    }

    /* Controls that belong with the title sit right after it rather than being
       thrown to the far edge by space-between, and share its baseline rather than
       its box bottom, so they read as part of the same line of text. */
    .pack {
        justify-content: start;
        align-items: baseline;
    }
</style>
