<script lang="ts">
    import { page } from '$app/state';
    import Emoji from '@components/app/Emoji.svelte';
    import getBreadcrumbTrail, {
        type Crumb,
    } from '@components/app/getBreadcrumbs';
    import Link from '@components/app/Link.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';

    interface Props {
        /** Display name for the gallery crumb on the how-to page, where the
         * gallery is an ancestor rather than the current page. */
        name?: string;
        /** Extra crumbs appended after the route trail — used by the guide to
         * append its concept path to the page breadcrumbs. */
        extra?: Crumb[];
    }

    let { name, extra }: Props = $props();

    // The route trail of ancestors, plus any caller-supplied extra crumbs.
    // Renders nothing for the landing page and the project route.
    let crumbs = $derived([
        ...getBreadcrumbTrail(page.route.id, page.params.galleryid, name),
        ...(extra ?? []),
    ]);
</script>

{#snippet crumbBody(crumb: Crumb)}
    {#if crumb.emoji}<Emoji>{crumb.emoji}</Emoji
        >&nbsp;{/if}{#if 'label' in crumb}<LocalizedText
            path={crumb.label}
        />{:else}{crumb.text}{/if}
{/snippet}

{#if crumbs.length > 0}
    <nav
        class="breadcrumbs"
        aria-label={$locales.getPlainText((l) => l.ui.page.breadcrumb.label)}
    >
        {#each crumbs as crumb, index (index)}
            {#if index > 0}<span class="separator" aria-hidden="true">/</span
                >{/if}{#if 'to' in crumb}<Link to={crumb.to}
                    >{@render crumbBody(crumb)}</Link
                >{:else if 'action' in crumb}<button
                    type="button"
                    class="crumb"
                    onclick={crumb.action}>{@render crumbBody(crumb)}</button
                >{:else}<span class="crumb current" aria-current="page"
                    >{@render crumbBody(crumb)}</span
                >{/if}
        {/each}
    </nav>
{/if}

<style>
    .breadcrumbs {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        margin-block-end: var(--wordplay-spacing-half);
        font-size: var(--wordplay-small-font-size);
        /* The header below is pulled up (negative margin / cap trim) so its top
           whitespace overlaps the breadcrumb. As a later sibling it would
           otherwise capture clicks on the breadcrumb's lower half, so lift the
           breadcrumb above it. */
        position: relative;
        z-index: 1;
    }

    /* A page header right below the breadcrumb has a large, viewport-scaled
       font, so the empty space above its cap (inside the line box) grows with
       the font size — making the breadcrumb-to-header gap drift. Fallback:
       approximate the cap trim with a negative top margin in `em` (relative to
       the header's own font), so the gap stays roughly constant. */
    .breadcrumbs + :global(h1) {
        margin-block-start: -0.25em;
    }

    /* Where supported, trim the header's top space precisely to the cap height,
       so the gap is exactly the breadcrumb's own bottom margin — truly constant
       regardless of header size. */
    @supports (text-box-edge: cap) {
        .breadcrumbs + :global(h1) {
            margin-block-start: 0;
            text-box-trim: trim-start;
            text-box-edge: cap alphabetic;
        }
    }

    .separator {
        color: var(--wordplay-inactive-color);
    }

    /* Clickable crumbs (the guide's concept-path jumps) are buttons, but should
       read as links — same highlight color and hover underline as the Link
       crumbs next to them — so they don't look like inactive text. */
    .crumb {
        font-family: inherit;
        font-size: inherit;
        color: var(--wordplay-highlight-color);
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
    }

    .crumb:focus,
    .crumb:hover {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }

    .crumb.current {
        color: var(--wordplay-inactive-color);
        cursor: default;
        text-decoration: none;
    }
</style>
