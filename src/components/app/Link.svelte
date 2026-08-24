<script lang="ts">
    import { browser } from '$app/environment';
    import { page } from '$app/state';
    import {
        getLocalizing,
        setLinkLocalize,
    } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import getLinkState from './linkState';

    interface Props {
        to: string;
        tip?: LocaleTextAccessor | undefined;
        nowrap?: boolean;
        external?: boolean;
        /** Force a full-page navigation (data-sveltekit-reload) instead of a
         * client-side one. Use when the destination must load fresh code/data
         * rather than render with the bundle this tab is already running —
         * e.g. linking to /updates from the new-version notification. */
        reload?: boolean;
        label?: LocaleTextAccessor;
        /** Accessible name override for links whose visible content isn't
         * text (e.g., an image-only preview) — WCAG requires every link to
         * have an accessible name. */
        ariaLabel?: LocaleTextAccessor | undefined;
        /** A download link to a static asset (e.g. /icons/logo.svg): skips
         * the locale prefix and client routing, and asks the browser to save
         * the file rather than navigate. */
        download?: boolean;
        /** The content is a graphic rather than text. Browsers skip atomic
         * inline boxes when painting text decorations, so such a link needs
         * its hover and focus states drawn as a bar instead. */
        graphic?: boolean;
        /** Extra path prefixes that belong to this destination's section, for
         * the tab treatment. A project page lives at /project/…, not
         * /projects/…, so which section a path belongs to can't always be
         * derived from the path itself. */
        within?: string[];
        /** Render as a tab: padded chrome with a real pointer target and a
         * selected state, for a row of links that was hard to notice and to
         * hit as bare text (#836). */
        tab?: boolean;
        children?: import('svelte').Snippet;
    }

    let {
        to,
        tip = undefined,
        nowrap = false,
        external = false,
        reload = false,
        label,
        ariaLabel = undefined,
        download = false,
        tab = false,
        graphic = false,
        within = [],
        children,
    }: Props = $props();

    let localizing = getLocalizing();

    // A LocalizedText child registers its path here so the edit affordance can
    // render outside the anchor. See `LinkLocalizeContext` for the rationale.
    let registeredPath = $state<LocaleTextAccessor | undefined>(undefined);
    setLinkLocalize({
        register: (path) => (registeredPath = path),
    });

    // True while the edit-affordance LocalizedText is showing its inline editor.
    // We hide the anchor during edit so the field has the row to itself.
    let editing = $state(false);

    // Prefix internal paths with the current locale segment. Downloads point
    // at static assets, which live outside the locale tree.
    let href = $derived.by(() => {
        if (download || external || to.startsWith('http')) return to;
        const locale = page.params.locale;
        if (!locale) return to;
        return `/${locale}${to === '/' ? '' : to}`;
    });

    // Where this link stands relative to the page being viewed. The logic is in
    // its own module because it is fiddly enough to be worth testing directly —
    // locale stripping, query normalization, and section matching — and none of
    // it needs a DOM. See linkState.test.ts.
    const where = $derived(
        download
            ? { active: false, inSection: false }
            : getLinkState(
                  page.url.pathname,
                  // Reading url.search during prerendering throws, so fall back
                  // to no query at build time and read the real one during
                  // hydration, as Guide.svelte does. A prerendered page is the
                  // query-less one anyway.
                  browser ? page.url.search : '',
                  page.params.locale,
                  to,
                  within,
              ),
    );
    let isActive = $derived(where.active);
    let inSection = $derived(where.inSection);
</script>

<!-- LocalizedText children render as plain text (via the link context),
     keeping the anchor a clean hyperlink. The edit affordance for localize
     mode sits *beside* the link — see LinkLocalizeContext. -->
{#snippet labelOrChildren()}
    {#if children}{@render children()}{:else if label}<LocalizedText
            path={label}
        />{/if}
{/snippet}

<!-- Keep `linkPart` in a stable position in the tree across registeredPath
     transitions — moving it would unmount and remount the LocalizedText child
     it contains, whose mount-time register() call would flip registeredPath
     back and trigger an infinite re-mount loop. -->
{#snippet linkPart()}
    {#if isActive}
        <span
            class="link inactive"
            class:tab
            class:current={inSection}
            aria-current="page">{@render labelOrChildren()}</span
        >
    {:else}<a
            data-sveltekit-preload-data={download ? null : 'tap'}
            data-sveltekit-reload={reload || download ? '' : null}
            download={download ? '' : null}
            aria-label={ariaLabel
                ? $locales.getPrimaryPlainText(ariaLabel)
                : undefined}
            title={tip ? $locales.getPlainText(tip) : undefined}
            {href}
            target={external ? '_blank' : null}
            class="link"
            class:nowrap
            class:tab
            class:graphic
            class:current={inSection}
            aria-current={inSection ? 'true' : undefined}
            >{@render labelOrChildren()}{#if external}<span class="external"
                    >↗</span
                >{/if}</a
        >{/if}
{/snippet}

{#if localizing?.on}
    <span class="link-with-editor link" class:editing>
        <span class="link-part">{@render linkPart()}</span
        >{#if registeredPath !== undefined}<LocalizedText
                path={registeredPath}
                editOnly
                onEditingChange={(e) => (editing = e)}
            />{/if}
    </span>
{:else}
    {@render linkPart()}
{/if}

<style>
    .link {
        align-self: flex-start;
    }

    .nowrap {
        white-space: nowrap;
    }

    /* A link to the page you're already on: greyed, no underline, to signal it's
       inactive. Tabs opt out below, where greyed would read as disabled rather
       than as where you are. */
    .inactive:not(.tab) {
        color: var(--wordplay-inactive-color);
        text-decoration: none;
    }

    /* The tab variant (#836): a padded, reliably clickable target that still
       reads as a link. The shape is Tabbed's — including its reserved
       transparent border, so marking a section can't shift the row — but only
       the section you're in is ever drawn as a box. Anything drawn at rest here
       would make a row of links look like a row of toggles. */
    .tab {
        display: inline-flex;
        /* Stretch so every tab is the height of the row: the Logo's line box
           is shorter than an emoji's, and the current tab has to reach the
           nav's rule to merge with it. The row opts in (see Page). */
        align-self: stretch;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        box-sizing: border-box;
        padding: var(--wordplay-spacing-half) var(--wordplay-spacing);
        /* WCAG 2.5.8's 24px minimum target, as Button, Mode, and Tabbed
           state it. */
        min-width: max(var(--wordplay-widget-height), 24px);
        min-height: max(var(--wordplay-widget-height), 24px);
        background: none;
        border: var(--wordplay-border-width) solid transparent;
        border-block-start: none;
        /* No decoration on the box. The underline belongs to the words, and is
           drawn on the label instead (see Page): a line running under an icon
           reads as noise, and Chromium breaks the anchor's own underline at
           every flex item anyway. */
        text-decoration: none;
    }

    /* The section you're in — its landing page, or any page beneath it. This is
       Tabbed's selected tab flipped vertically, because this bar sits below its
       "panel" rather than above: open at the top, rounded at the bottom, and
       overhanging the nav's rule so its fill covers that segment and the tab
       merges with the page. On a subpage it stays a real link back to the
       section's landing page; only the landing page itself goes quiet. */
    .tab.current {
        background: var(--wordplay-background);
        border-color: var(--wordplay-border-color);
        border-block-start: none;
        border-end-start-radius: var(--wordplay-border-radius);
        border-end-end-radius: var(--wordplay-border-radius);
        /* The raised inline-end edge the app's other controls carry. Only that
           edge: one on the block start would draw a line across the top and
           break the merge. */
        box-shadow: var(--wordplay-border-width) 0 0
            var(--wordplay-border-color);
        margin-block-start: calc(-1 * var(--wordplay-border-width));
    }

    .tab.current.inactive {
        color: var(--wordplay-foreground);
    }

    /* A link whose content is a graphic can't take a text underline at all —
       decorations aren't painted over atomic inline boxes — so its hover and
       focus are drawn as a bar. It carries no resting bar: the logo is a mark,
       and underlining a mark reads as clutter. */
    a.graphic:hover,
    a.graphic:focus {
        text-decoration: none;
        box-shadow: inset 0 calc(-1 * var(--wordplay-focus-width)) 0
            var(--wordplay-focus-color);
    }

    .external {
        font-family: 'Noto Emoji';
        font-size: calc(var(--wordplay-font-size) - 6pt);
        display: inline-block;
        margin-inline-start: 0.25em;
    }

    .link-with-editor {
        display: inline-flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        vertical-align: middle;
    }

    /* While the inline editor is open, give the field + action buttons the row
       to themselves by hiding the link half (rather than unmounting it, which
       would tear down the LocalizedText that has registered our path). */
    .link-with-editor.editing > .link-part {
        display: none;
    }
</style>
