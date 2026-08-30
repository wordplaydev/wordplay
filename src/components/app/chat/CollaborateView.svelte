<!--
 This chat component enables communication between project collaborators and owners of the gallery that a project is in.
 -->
<script lang="ts">
    import ChatView from '@components/app/chat/ChatView.svelte';
    import Collaborators from '@components/project/Collaborators.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import TileMessage from '@components/project/TileMessage.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Creators, Galleries, locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import type Gallery from '@db/galleries/Gallery';
    import type Project from '@db/projects/Project';

    const {
        project,
        chat,
    }: { project: Project; chat: Chat | undefined | null | false } = $props();

    const user = getUser();

    let owner = $derived(project.getOwner());

    // Load the gallery if it exists.
    const galleryID = $derived(project.getGallery());
    let gallery = $state<Gallery | undefined>(undefined);
    $effect(() => {
        if (galleryID) {
            Galleries.get(galleryID).then((g) => {
                gallery = g;
            });
        } else gallery = undefined;
    });

    let creators: Record<string, Creator | null> = $state({});

    // Set the creators to whatever user IDs we have.
    $effect(() => {
        const owner = project.getOwner();
        // We async load all participants, regardless of their chat eligibility, since we need to render
        // their names.
        Creators.getCreatorsByUIDs(
            chat
                ? [...chat.getAllParticipants(), ...(owner ? [owner] : [])]
                : owner
                  ? [owner]
                  : [],
        ).then((map) => (creators = map));
    });

    let editable = $derived(
        isAuthenticated($user) && project.getOwner() === $user.uid,
    );

    /** Whether someone is writing a message. Held here rather than in either
     *  child because it is what the two of them share: the composer reports it
     *  and the people above the conversation act on it. */
    let composing = $state(false);
</script>

{#if owner === null}
    <TileMessage error>
        <p><LocalizedText path={(l) => l.ui.collaborate.error.unowned} /></p>
    </TileMessage>
{:else}
    <section
        class="collab"
        data-uiid="collaborate"
        aria-label={$locales.getPrimaryPlainText((l) => l.ui.collaborate.label)}
    >
        <Collaborators {project} {gallery} {editable} collapsed={composing} />

        <!-- Allow the owner to restrict access to non-curators -->
        {#if gallery && editable}
            <span data-uiid="restrictGallery">
                <Mode
                    modes={(l) =>
                        l.ui.collaborate.restrictGalleryCreatorAccess.mode}
                    choice={project.getRestrictedGallery() ? 1 : 0}
                    select={(index) =>
                        Projects.reviseProject(
                            project.withRestrictedGallery(index === 1),
                        )}
                />
            </span>
        {/if}

        <ChatView
            {chat}
            {creators}
            {galleryID}
            {project}
            composing={(writing) => (composing = writing)}
        />
    </section>
{/if}

<style>
    .collab {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        container-type: size;
    }
</style>
