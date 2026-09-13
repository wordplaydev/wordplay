<!-- A kit in the registry (#8).

     A tile used to be a bare `amy/colors`, which says only that a kit exists. It now says
     what a kit is for, in its author's own words, beside the `⭐` example they wrote —
     the shape a project tile already uses, and rendered from the preview cached on the
     kit itself, so a page of tiles is one query and browsing the registry evaluates
     nothing. -->
<script lang="ts">
    import Contributors from '@components/app/Contributors.svelte';
    import GlyphTile from '@components/app/GlyphTile.svelte';
    import Link from '@components/app/Link.svelte';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Note from '@components/widgets/Note.svelte';
    import { kitURL } from '@concepts/ConceptParams';
    import { anonymizeContributors } from '@db/creators/attribution';
    import { locales } from '@db/Database';
    import { kitVisibility } from '@db/moderation/visibility';
    import type { SerializedKit } from '@db/kits/Kit';
    import { localizedConceptName } from '@locale/getConceptName';
    import { toProgram } from '@parser/parseProgram';

    interface Props {
        kit: SerializedKit;
        /** Show where this kit stands with the moderators. Only its owner is shown this,
         *  and only in their own group — a standing is not a fact about the kit that a
         *  reader browsing the registry has any use for. */
        standing?: boolean;
    }

    let { kit, standing = false }: Props = $props();

    /** The line a creator would write to use this kit, which is what they came for —
     *  drawn as code rather than hidden behind a clipboard button, because that is how
     *  the guide shows code and this tile now lives in the guide. `ConceptPreview` gives
     *  it focus and Ctrl/Cmd-C with a ✓, the same as on the kit's own page. */
    const borrow = $derived(
        toProgram(`↓ @${kit.name} ${kit.latest}`).borrows[0],
    );

    /** The short status label, which is the register a tile wants — the sentence that
     *  explains it lives on the kit's page and in the publish panel. */
    const state = $derived(kit.moderation);

    /** What this kit shares, named in the reader's own language from the stored ids. */
    const kinds = $derived(
        kit.kinds.map((id) => localizedConceptName($locales.getLocales(), id)),
    );
</script>

<div class="kit">
    {#if kit.preview}
        <Link
            to={kitURL(kit.name)}
            tip={(l) => l.ui.docs.kits.open}
            graphic
            ariaLabel={(l) => l.ui.docs.kits.open}
        >
            <div class="tile"><GlyphTile preview={kit.preview} /></div>
        </Link>
    {/if}
    <div class="words">
        <div class="title">
            <Link to={kitURL(kit.name)} tip={(l) => l.ui.docs.kits.open}>
                <code>{kit.name}</code>
            </Link>
        </div>
        {#if borrow}
            <ConceptPreview node={borrow} describe={false} />
        {/if}
        {#if kit.description.length > 0}
            <div class="description">{kit.description}</div>
        {/if}
        <!-- Who published it. The owner's handle is already in the borrow line
             above — it has to be, since a kit is reached by `@owner/name` — so
             this discloses nothing new. What it adds is that the author is a
             person rather than a path segment (#906). -->
        <Contributors
            creator={kit.owner}
            collaborators={kit.collaborators}
            anonymize={anonymizeContributors(kitVisibility(kit))}
        />
        {#if kinds.length > 0}
            <Note
                >{$locales
                    .concretize((l) => l.ui.docs.kits.shares, {
                        names: kinds.join(', '),
                    })
                    .toText()}</Note
            >
        {/if}
        {#if standing}
            <Note
                ><LocalizedText
                    path={(l) => l.ui.dialog.share.kit.moderation[state]}
                /></Note
            >
        {/if}
    </div>
</div>

<style>
    .kit {
        display: flex;
        align-items: flex-start;
        gap: var(--wordplay-spacing);
    }

    .words {
        display: flex;
        flex-direction: column;
        gap: calc(var(--wordplay-spacing) / 2);
        min-inline-size: 0;
    }

    .title {
        display: flex;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .description {
        color: var(--wordplay-inactive-color);
    }

    /* GlyphTile takes its size from its container, so the container has one. */
    .tile {
        inline-size: 3em;
        block-size: 3em;
        font-size: 2em;
        overflow: hidden;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }
</style>
