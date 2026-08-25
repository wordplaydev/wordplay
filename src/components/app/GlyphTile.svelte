<!-- The shared presentational square for glyph-based preview tiles
     (ProjectPreview and HowToPreview): renders a persisted/extracted preview's
     representative glyph or custom character on its output colors, a spinner
     while one is being computed, and owns loading the glyph's font face and
     resolving the character SVG. Sizing (width/height/font-size) is inherited
     from the parent container. -->
<script lang="ts">
    import Fonts from '@basis/faces/Fonts';
    import Spinning from '@components/app/Spinning.svelte';
    import EmojisRepaired from '@components/widgets/EmojisRepaired.svelte';
    import { characterToSVG, type Character } from '@db/characters/Character';
    import { adaptPreviewColors } from '@components/app/adaptPreview';
    import { adaptingOutput, CharactersDB } from '@db/Database';
    import type { SerializedPreviewContent } from '@db/projects/ProjectSchemas';

    interface Props {
        /** The preview to render, or null while one is being computed (shows a spinner). */
        preview: SerializedPreviewContent | null;
        /** Whether to blur the glyph (e.g., flagged content shown to audiences). */
        blurred?: boolean;
    }

    let { preview, blurred = false }: Props = $props();

    // Make sure the font for the face is loaded so the glyph renders in its
    // intended typeface instead of falling back.
    $effect(() => {
        if (preview?.face) Fonts.loadFaceFromCSS(preview.face);
    });

    // Resolve the custom character SVG when the preview names one.
    let character = $state<Character | null>(null);
    $effect(() => {
        const name = preview?.characterName ?? null;
        if (!name) {
            character = null;
            return;
        }
        let cancelled = false;
        CharactersDB.getByName(name)
            .then((result) => {
                if (!cancelled) character = result ?? null;
            })
            .catch(() => {
                if (!cancelled) character = null;
            });
        return () => {
            cancelled = true;
        };
    });

    /** The preview's colors as this viewer should see them: adapted when they
     *  are in dark mode and the project is bright. Derived rather than computed
     *  per render, so the color parse happens only when one of the two changes. */
    const colors = $derived(adaptPreviewColors(preview, $adaptingOutput));
</script>

<div
    class="glyph"
    role="presentation"
    style:background={colors.background}
    style:color={colors.foreground}
    style:font-family={preview?.face ?? null}
    style:color-scheme={colors.scheme}
    class:blurred
>
    {#if preview === null}
        <Spinning />
    {:else if character}
        {@html characterToSVG(
            character,
            '100%',
            undefined,
            colors.scheme === 'dark',
        )}
    {:else}
        <EmojisRepaired text={preview.text} />
    {/if}
</div>

<style>
    .glyph {
        display: flex;
        /** For some reason this is necessary for keeping the character centered. */
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        /* The color scheme is declared inline from the preview's own background
           (see adaptPreviewColors), matching OutputView/StageView. */
        background: var(--wordplay-background);
        text-decoration: none;
        color: var(--wordplay-foreground);
    }

    .blurred {
        filter: blur(10px);
    }
</style>
