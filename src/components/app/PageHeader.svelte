<script lang="ts">
    import Breadcrumbs from '@components/app/Breadcrumbs.svelte';
    import type { Crumb } from '@components/app/getBreadcrumbs';
    import Header from '@components/app/Header.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import type { Snippet } from 'svelte';

    interface Props {
        /** Passthrough to Breadcrumbs: display name for an ancestor crumb
         * (e.g. the gallery name on the how-to page). */
        name?: string | undefined;
        /** Passthrough to Breadcrumbs: extra crumbs appended after the route
         * trail (e.g. the guide's concept path). */
        extra?: Crumb[] | undefined;
        /** The page title text. Used when the `title` snippet is absent. */
        header?: LocaleTextAccessor | undefined;
        /** Custom title content for interactive titles (e.g. an editable
         * TextField). Rendered inside the <h1>; takes precedence over `header`. */
        title?: Snippet | undefined;
        /** Passthrough to Header; defaults to true to match standard pages. */
        block?: boolean | undefined;
        /** Passthrough to Header. */
        wrap?: boolean | undefined;
        /** The page description/tagline, rendered as Wordplay markup. */
        description?: LocaleTextsAccessor | undefined;
        /** Custom description content; takes precedence over `description`. */
        extraDescription?: Snippet;
        /** Optional controls rendered inline at the end of the breadcrumb row. */
        breadcrumbControls?: Snippet | undefined;
        /** Whether to render the breadcrumb trail above the header. Off for pages
         *  that place the trail elsewhere — the tutorial puts it beside the header,
         *  since the space to the header's end would otherwise sit empty. */
        breadcrumbs?: boolean;
    }

    let {
        name,
        extra,
        header,
        title,
        block = true,
        wrap = false,
        description,
        extraDescription,
        breadcrumbControls,
        breadcrumbs = true,
    }: Props = $props();
</script>

<!-- The Breadcrumbs nav and the Header's <h1> must stay immediate DOM siblings
     so Breadcrumbs' `.breadcrumbs + h1` cap-trim selector keeps the
     breadcrumb-to-header gap constant; don't place anything between them. The
     flex column guarantees the trio stacks vertically regardless of the parent
     page's layout. -->
<div class="page-header">
    {#if breadcrumbs}<Breadcrumbs
            {name}
            {extra}
            controls={breadcrumbControls}
        />{/if}{#if title}<Header {block} {wrap}>{@render title()}</Header
        >{:else if header}<Header {block} {wrap} text={header} />{/if}
    {#if extraDescription}{@render extraDescription()}{:else if description}<MarkupHTMLView
            markup={description}
        />{/if}
</div>

<style>
    .page-header {
        display: flex;
        flex-direction: column;
    }

    /* Without a breadcrumb above it to trim the header's top whitespace (see
       Breadcrumbs), a large viewport-scaled header leaves a growing gap above its
       cap. Trim it here too, so a header that starts the page sits at the top. */
    .page-header > :global(h1:first-child) {
        margin-block-start: -0.25em;
    }

    @supports (text-box-edge: cap) {
        .page-header > :global(h1:first-child) {
            margin-block-start: 0;
            text-box-trim: trim-start;
            text-box-edge: cap alphabetic;
        }
    }
</style>
