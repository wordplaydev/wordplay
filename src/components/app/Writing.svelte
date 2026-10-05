<script lang="ts">
    import { type Snippet } from 'svelte';
    import Page from '#components/app/Page.svelte';
    import { seasonShown } from '#db/Database.ts';

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

    let column: HTMLElement | undefined = $state();
</script>

<Page {footer}>
    <!-- The frame the season's figures fill (#108), so they scroll with the
         page and stay beside this column. Loaded only when a season shows. -->
    <div class="season-frame">
        {#if $seasonShown}
            {#await import('#components/app/SeasonLayer.svelte') then { default: SeasonLayer }}
                <SeasonLayer shown={$seasonShown} {column} />
            {/await}
        {/if}
        <div
            class="writing"
            class:wide
            class:reading-surface={reading}
            class:reading-pane={reading}
            bind:this={column}
        >
            {@render children()}
        </div>
    </div>
</Page>

<style>
    /* Positioned and full width so the season's layer can fill the page
       beside the column; isolated so that layer stays behind the content. */
    .season-frame {
        position: relative;
        isolation: isolate;
        align-self: stretch;
    }

    .writing {
        /* The measure for every static page: the column's width is its extent
           along the text, whichever axis that is. The writing mode itself comes
           from the global `reading` class in app.html. */
        margin-inline-start: auto;
        margin-inline-end: auto;
        inline-size: 70%;
        max-inline-size: 40em;
        text-align: start;
        /* scale: the reading column's measure family, set in the reading font's own em beside max-inline-size: 40em. */
        margin-block-start: 4em;
        margin-block-end: 4em;
    }

    .writing.wide {
        inline-size: 90%;
        max-inline-size: 72em;
    }

    :global(p:not(:last-of-type)) {
        /* scale: the reading column's measure family, set in the reading font's own em. */
        margin-block-end: 1em;
    }
</style>
