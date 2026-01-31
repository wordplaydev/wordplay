<!-- 
 This chat component enables communication between project collaborators and owners of the gallery that a project is in. 
 -->
<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import TileMessage from '@components/project/TileMessage.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import { Creators, Galleries, locales, Projects } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type Project from '@db/projects/Project';
    import CreatorView from '../CreatorView.svelte';
    import ChatView from './ChatView.svelte';

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
    let collaborator = $derived(
        isAuthenticated($user) && project.hasCollaborator($user.uid),
    );
    let commenter = $derived(
        isAuthenticated($user) && project.hasCommenter($user.uid),
    );
</script>

{#if owner === null}
    <TileMessage error>
        <p><LocalizedText path={(l) => l.ui.collaborate.error.unowned} /></p>
    </TileMessage>
{:else}
    <section
        class="collab"
        aria-label={$locales.get((l) => l.ui.collaborate.label)}
    >
        <MarkupHTMLView
            markup={editable
                ? project.getCollaborators().length === 0
                    ? (l) => l.ui.collaborate.prompt.solo
                    : (l) => l.ui.collaborate.prompt.owner
                : collaborator
                  ? (l) => l.ui.collaborate.prompt.collaborator
                  : commenter
                    ? (l) => l.ui.collaborate.prompt.commenter
                    : (l) => l.ui.collaborate.prompt.curator}
        ></MarkupHTMLView>

        <div class="everyone">
            <!-- If not the owner, show it -->
            {#if isAuthenticated($user) && owner !== $user.uid}
                <Labeled label={(l) => l.ui.collaborate.role.owner}>
                    <CreatorView
                        chrome
                        anonymize={false}
                        creator={creators[owner]}
                    />
                </Labeled>
            {/if}

            <!-- Show all of the collaborators -->
            {#if owner == $user?.uid || project.getCollaborators().length > 0}
                <Labeled label={(l) => l.ui.collaborate.role.collaborators}>
                    <CreatorList
                        anonymize={false}
                        uids={project.getCollaborators()}
                        {editable}
                        add={(userID) =>
                            Projects.reviseProject(
                                project.withCollaborator(userID),
                            )}
                        remove={(userID) =>
                            Projects.reviseProject(
                                project.withoutCollaborator(userID),
                            )}
                        removable={() => true}
                    />
                </Labeled>
            {/if}

            <!-- Show all of the commenters -->
            {#if owner === $user?.uid || project.getCommenters().length > 0}
                <Labeled label={(l) => l.ui.collaborate.role.commenters}>
                    <CreatorList
                        anonymize={false}
                        uids={project.getCommenters()}
                        {editable}
                        add={(userID) =>
                            Projects.reviseProject(
                                project.withCommenter(userID),
                            )}
                        remove={(userID) =>
                            Projects.reviseProject(
                                project.withoutCommenter(userID),
                            )}
                        removable={() => true}
                    />
                </Labeled>
            {/if}

            <!-- Show all of the viewers -->
            {#if owner === $user?.uid || project.getViewers().length > 0}
                <Labeled label={(l) => l.ui.collaborate.role.viewers}>
                    <CreatorList
                        anonymize={false}
                        uids={project.getViewers()}
                        {editable}
                        add={(userID) =>
                            Projects.reviseProject(project.withViewer(userID))}
                        remove={(userID) =>
                            Projects.reviseProject(
                                project.withoutViewer(userID),
                            )}
                        removable={() => true}
                    />
                </Labeled>
            {/if}

            {#if gallery}
                {#if owner === $user?.uid}
                    <MarkupHTMLView
                        markup={(l) =>
                            l.ui.collaborate.restrictGalleryCreatorAccess
                                .explanation}
                    />
                {/if}

                <!-- Show the curators, if in a gallery -->
                <Labeled label={(l) => l.ui.collaborate.role.curators}>
                    <CreatorList
                        anonymize={false}
                        editable={false}
                        uids={gallery.getCurators()}
                    />
                </Labeled>

                <!-- Allow user to restrict access to non-curators -->
                {#if owner === $user?.uid}
                    <Mode
                        modes={(l) =>
                            l.ui.collaborate.restrictGalleryCreatorAccess.mode}
                        choice={project.getRestrictedGallery() ? 1 : 0}
                        select={(index) =>
                            Projects.reviseProject(
                                project.withRestrictedGallery(index === 1),
                            )}
                    />
                {/if}
            {/if}
        </div>

        <ChatView {chat} {creators} {galleryID} {project} />
    </section>
{/if}

<style>
    .collab {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }

    .everyone {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
