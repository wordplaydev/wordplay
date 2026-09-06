<!-- The shared card for a custom character: its drawing, its name, and
     whatever controls the surface showing it offers. Extracted from the
     characters page so a gallery can show the same tile (#822).

     Two shapes, because the two surfaces differ in one way that matters: on
     the characters page every character is yours, so the tile is a link into
     the editor; in a gallery most of them are someone else's, so the tile is
     inert and the controls carry every action. -->
<script lang="ts">
    import type { Snippet } from 'svelte';
    import Link from '@components/app/Link.svelte';
    import { locales } from '@db/Database';
    import {
        bareCharacterName,
        characterToSVG,
        type Character,
    } from '@db/characters/Character';

    interface Props {
        character: Character;
        /** Where the tile leads. Omitted for an inert tile. */
        link?: string | undefined;
        /** The buttons under the drawing. */
        controls?: Snippet;
    }

    let { character, link = undefined, controls = undefined }: Props = $props();

    let name = $derived(bareCharacterName(character));
    let hasName = $derived(name.length > 0);
    /** The full `username/Name`, which is what a reference to it is written
     *  with — worth having on hover even though the tile shows the bare name. */
    let reference = $derived(character.name);
</script>

<div class="preview">
    {#if link}
        <!-- One link for both the image and the name: the name is the link's
             accessible text (the SVG is a decorative duplicate, hence
             aria-hidden), with a localized fallback label when unnamed. -->
        <Link
            to={link}
            ariaLabel={hasName
                ? undefined
                : (l) => l.ui.page.characters.unnamed}
        >
            <div class="character" aria-hidden="true">
                {@html characterToSVG(character, 128)}
            </div>
            <div class="name">{hasName ? name : '—'}</div>
        </Link>
    {:else}
        <!-- Inert, so the drawing carries its own accessible name rather than
             borrowing a link's. Primary locale only, as every aria-* is. -->
        <div
            class="character"
            role="img"
            aria-label={hasName
                ? reference
                : $locales.getPrimaryPlainText(
                      (l) => l.ui.page.characters.unnamed,
                  )}
        >
            {@html characterToSVG(character, 128)}
        </div>
        <div class="name" title={reference}>{hasName ? name : '—'}</div>
    {/if}
    {#if controls}
        <div class="tools">{@render controls()}</div>
    {/if}
</div>

<style>
    .preview {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: var(--wordplay-spacing);
    }

    .character {
        /* Block (not inline-block) so the preview box doesn't sit on the
           link's text baseline — inline-block left ~5px of descender space
           below the 64px box from the line-height strut. */
        display: block;
        width: 128px;
        height: 128px;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    /* Names are far less important here than a project's, since the drawing
       itself is the whole preview — so one line, clipped to the box, with the
       full reference on hover. */
    .name {
        max-width: 128px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .tools {
        display: flex;
        flex-direction: row;
        align-items: start;
        gap: var(--wordplay-spacing);
    }
</style>
