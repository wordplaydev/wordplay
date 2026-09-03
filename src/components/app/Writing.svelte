<script lang="ts">
    import { type Snippet } from 'svelte';
    import Page from '@components/app/Page.svelte';

    interface Props {
        children: Snippet;
        footer?: boolean;
        /** Widen the text column for pages that are primarily lists of previews,
         * so they have room for multiple grid columns. */
        wide?: boolean;
        /**
         * Whether this page is something read at length, and so follows the
         * reader's writing layout. Off by default, because most pages built on
         * this are listings (projects, galleries, characters, teach) or forms
         * (login, join, profile, localize) — places you *operate*, which the
         * rule in app.html deliberately leaves horizontal. Marking the wrapper
         * rather than the prose pages turned all of them vertical, and a grid
         * inside vertical text is laid out within a column: `/projects` measured
         * zero pixels wide.
         */
        reading?: boolean;
    }

    let {
        children,
        footer = true,
        wide = false,
        reading = false,
    }: Props = $props();
</script>

<Page {footer}>
    <div
        class="writing"
        class:wide
        class:reading-surface={reading}
        class:reading-pane={reading}
    >
        {@render children()}
    </div>
</Page>

<style>
    .writing {
        /* The measure for every static page: the column's width is its extent
           along the text, whichever axis that is. The writing mode itself comes
           from the global `reading` class in app.html. */
        margin-inline-start: auto;
        margin-inline-end: auto;
        inline-size: 70%;
        max-inline-size: 40em;
        text-align: start;
        margin-block-start: 4em;
        margin-block-end: 4em;
    }

    .writing.wide {
        inline-size: 90%;
        max-inline-size: 72em;
    }

    :global(p:not(:last-of-type)) {
        margin-block-end: 1em;
    }
</style>
