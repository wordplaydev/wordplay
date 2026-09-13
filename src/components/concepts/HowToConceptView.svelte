<script lang="ts">
    import { goto } from '$app/navigation';
    import Subheader from '@components/app/Subheader.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import type GalleryHowConcept from '@concepts/GalleryHowConcept';
    import { Galleries, HowTos, locales } from '@db/Database';
    import { canInteractSocially } from '@db/howtos/howToAccess';
    import Contributors from '@components/app/Contributors.svelte';
    import { anonymizeContributors } from '@db/creators/attribution';
    import ReportButton from '@components/project/ReportButton.svelte';
    import getResponsibility from '@db/moderation/responsibility';
    import { howToVisibility } from '@db/moderation/visibility';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { HowToFields } from '@db/rulesFields';
    import { onMount } from 'svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import HowToPrompt from '../../routes/[[locale]]/gallery/[galleryid]/howto/HowToPrompt.svelte';

    interface Props {
        concept: GalleryHowConcept;
    }

    let { concept }: Props = $props();

    let preferredLocale: string = $derived($locales.getLocaleString());

    // add the user to the list of those who have viewed this how-to
    const user = getUser();

    /** The gallery this how-to came from, when the reader can see one at all. A
     *  listed how-to reaches the guide from galleries most readers are not in. */
    let gallery = $derived(
        Galleries.accessibleGalleries.get(concept.howTo.getHowToGalleryId()) ??
            Galleries.expandedScopeGalleries.get(
                concept.howTo.getHowToGalleryId(),
            ),
    );

    onMount(() => {
        // The update rule requires an authenticated caller, so a signed-out
        // reader's view cannot be recorded at all — attempting it was a
        // guaranteed permission-denied on every how-to rendered, counted as a
        // failed save. Counting anonymous views would have to be a callable.
        if (!isAuthenticated($user)) return;
        // Nor a signed-in stranger's. Since #906 this view renders how-tos listed
        // in the guide, whose readers are mostly in neither the gallery nor its
        // expanded-access list — and the `social` opening admits only those two,
        // so every such read would be a refused write counted as a failed save.
        // `canInteractSocially` is the same question the rule asks.
        if (!canInteractSocially(concept.howTo, gallery, $user.uid)) return;

        const seen = concept.howTo.getSeenByUsers();
        const seenByUsers = seen.includes($user.uid)
            ? seen
            : [...seen, $user.uid];

        HowTos.updateHowTo(
            new HowTo({
                ...concept.howTo.getData(),
                social: {
                    ...concept.howTo.getSocial(),
                    seenByUsers: seenByUsers,
                    viewCount: concept.howTo.getViewCount() + 1,
                },
            }),
            true,
            // A viewer reaches the document only through the rule's
            // `hasOnly(["social"])` opening; see HowToFields.
            HowToFields.Social,
        );
    });
</script>

<Subheader>{concept.howTo.getTitleInLocale(preferredLocale)}</Subheader>

<!-- Who wrote it. A how-to listed in the guide is read by people with no other way
     to know where it came from, and the whole point of listing community work is
     that it is someone's (#906). Whole handles, because attribution follows
     visibility and a listed how-to is public by precondition. -->
<Contributors
    creator={concept.howTo.getCreator()}
    collaborators={concept.howTo.getCollaborators()}
    anonymize={anonymizeContributors(
        howToVisibility(concept.howTo, gallery),
        $user !== null && $user !== undefined
            ? canInteractSocially(concept.howTo, gallery, $user.uid)
            : false,
    )}
/>

<Speech below character={concept.getCharacter()}>
    {#snippet content()}
        {@const questions = concept.howTo.getGuidingQuestions()}
        {@const answers = concept.howTo.getText()}
        {#if answers.some((a) => a.trim().length > 0)}
            {#each answers as answer, i (i)}
                {#if answer.trim().length > 0}
                    <HowToPrompt text={(l) => questions[i]} compact />
                    <MarkupHTMLView markup={answer} />
                {/if}
            {/each}
        {:else}
            {$locales.concretize((l) => l.ui.docs.nodoc)}
        {/if}
    {/snippet}
</Speech>

<!-- A how-to has been a reportable subject since #938 — the callable, the queue and
     the notice routing were all built — and until now no surface offered it, so the
     only way to report one was to hand-craft a request. Guarded as the character
     button is: signed in, not its author, and only where someone is responsible. -->
{#if $user && concept.howTo.getCreator() !== $user.uid && getResponsibility(howToVisibility(concept.howTo, gallery)).kind !== 'none'}
    <ReportButton
        kind="howto"
        subject={concept.howTo.getHowToId()}
        name={concept.howTo.getTitleInLocale(preferredLocale)}
    />
{/if}

<!-- Only where it leads somewhere. A listed how-to's gallery is usually private,
     and a link to a page that will refuse the reader is worse than no link. -->
{#if gallery}
    <Button
        label={(l) => l.ui.docs.how.howToGalleryButton.label}
        tip={(l) => l.ui.docs.how.howToGalleryButton.tip}
        action={() => goto(concept.getPath())}
    />
{/if}
