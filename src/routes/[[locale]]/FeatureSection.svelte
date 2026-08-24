<!--
    One block of the landing page's granular feature list: an emoji, a
    declarative headline, and the claims beneath it.

    The emoji always anchors the inline start. It alternated sides at first, but
    an emoji at the inline end reads as a detail hanging off the text rather than
    a marker introducing it, and the ragged left edge made the list harder to
    scan than a plain column of blocks.
-->
<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { withMonoEmoji } from '@unicode/emoji';

    interface Props {
        /** The section's symbol. Not localized: it's a picture, not a word. */
        icon: string;
        title: LocaleTextAccessor;
        bullets: LocaleTextsAccessor;
    }

    let { icon, title, bullets }: Props = $props();
</script>

<section>
    <div class="icon" aria-hidden="true"
        ><Emoji text={withMonoEmoji(icon)} /></div
    >
    <div class="prose">
        <Subheader text={title} />
        <MarkupHTMLView markup={bullets} />
    </div>
</section>

<style>
    section {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: var(--wordplay-spacing);
        padding-block: calc(var(--wordplay-spacing) * 1.5);
        /* The same measure the beta notice and the call to action keep: these
           are paragraphs, and past about 44em a line is hard to scan back from.
           The page lays several of these out per row when it has the width. */
        max-width: 44em;
    }

    .icon {
        font-size: min(40pt, 9vw);
        line-height: 1;
        flex-shrink: 0;
        color: var(--wordplay-inactive-color);
    }

    .prose {
        flex: 1;
        /* Both of these, and for different reasons: `min-width` lets this
           shrink below its widest claim as a flex item, and `width` stops it
           sizing to max-content in the single-column layout below, where the
           column's `align-items: flex-start` would otherwise let one code
           example set the width of the whole page. */
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        width: 100%;
        box-sizing: border-box;
    }

    /* These headlines are sentences, not the short labels Subheader is tuned
       for, so they have to wrap on a narrow screen. Its own `wrap` prop would
       do it, but that also centers the heading, which is wrong beside a
       left-aligned column of claims. */
    .prose :global(h2) {
        white-space: normal;
    }

    /* MarkupHTMLView lays its paragraphs out with flex, whose items refuse to
       shrink below their content by default — so without this the scroller
       below never gets the chance to scroll. */
    .prose :global(.markup-block),
    .prose :global(.markup) {
        min-width: 0;
        max-width: 100%;
    }

    /* Claims are a list, so they keep their markers. `overflow` on the list
       item itself would hide them — a marker is painted outside the item's
       content box, so any overflow but `visible` clips it away, which is what
       made the bullets disappear. Inline examples render as text now, so they
       wrap like the prose around them and nothing needs its own scroller.
       `break-word` is the backstop for a long unbroken run of code. */
    .prose :global(ul) {
        /* Enough to hang the marker, and no more: the claims then line up with
           the heading above them rather than stepping in. */
        padding-inline-start: 1.1em;
        margin-inline-start: 0;
    }

    .prose :global(li) {
        max-width: 100%;
        overflow-wrap: break-word;
    }

    @container (max-width: 700px) {
        .icon {
            font-size: min(32pt, 12vw);
        }
    }
</style>
