<!-- Who made a thing, as a row of creator chips.

     Extracted from `ProjectPreview`, which has had this shape since long before
     anything else needed it, so that a community how-to and a kit in the guide are
     credited the same way a project tile is rather than each inventing a byline
     (#906). Whether the handles are whole or truncated is `anonymizeContributors`'
     decision, not this component's — attribution follows visibility.

     Capped, and `…` rather than a count: a byline is an attribution, not a roster,
     and the roster is a click away wherever there is one. -->
<script lang="ts">
    import CreatorView from '@components/app/CreatorView.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import { Creators } from '@db/Database';

    interface Props {
        /** Whoever made it, or null where a thing is curated rather than authored. */
        creator: string | null;
        /** Everyone else who wrote it. */
        collaborators?: string[];
        anonymize?: boolean;
        /** How many collaborators to name before eliding the rest. */
        max?: number;
    }

    let {
        creator,
        collaborators = [],
        anonymize = true,
        max = 2,
    }: Props = $props();
</script>

<!-- Someone who doesn't resolve is skipped rather than drawn as `CreatorView`'s
     "—". A roster shows that dash on purpose — the slot is the point there — but a
     byline exists to name someone, and one naming nobody reads as a failure. It is
     not a rare case either: a built-in kit is owned by the sentinel `wordplay`
     rather than by an account, so every one of them drew a dash. -->
<div class="creators">
    {#if creator !== null}
        {#await Creators.getCreator(creator)}
            <Spinning />
        {:then found}
            {#if found}<CreatorView {anonymize} creator={found} />{/if}
        {/await}
    {/if}
    {#each collaborators.slice(0, max) as collaborator (collaborator)}
        {#await Creators.getCreator(collaborator)}
            <Spinning />
        {:then found}
            {#if found}<CreatorView {anonymize} creator={found} />{/if}
        {/await}
    {/each}
    {#if collaborators.length > max}
        <span>…</span>
    {/if}
</div>

<style>
    .creators {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }
</style>
