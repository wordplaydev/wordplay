<script lang="ts">
    import { page } from '$app/state';
    import AddProject from '@components/app/AddProject.svelte';
    import CharacterPreview from '@components/app/CharacterPreview.svelte';
    import Link from '@components/app/Link.svelte';
    import Loading from '@components/app/Loading.svelte';
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import PreviewPlaceholder from '@components/app/PreviewPlaceholder.svelte';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Public from '@components/project/Public.svelte';
    import {
        characterVisibility,
        galleryVisibility,
    } from '@db/moderation/visibility';
    import getResponsibility from '@db/moderation/responsibility';
    import ReportButton from '@components/project/ReportButton.svelte';
    import GalleryModerationNotice from './GalleryModerationNotice.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Title from '@components/widgets/Title.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import {
        CharactersDB,
        DB,
        authAttempted,
        disconnected,
        Galleries,
        locales,
    } from '@db/Database';
    import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@db/limits';
    import type Gallery from '@db/galleries/Gallery';
    import type {
        GalleryFailure,
        GalleryResult,
    } from '@db/galleries/GalleryDatabase.svelte';
    import {
        getClasses,
        type Class,
    } from '@db/teachers/TeacherDatabase.svelte';
    import type Project from '@db/projects/Project';
    import {
        bareCharacterName,
        type Character,
    } from '@db/characters/Character';
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import Button from '@components/widgets/Button.svelte';
    import NewCharacterButton from '../../characters/NewCharacterButton.svelte';
    import {
        CANCEL_SYMBOL,
        CONFIRM_SYMBOL,
        EDIT_SYMBOL,
        PASTE_SYMBOL,
        REMIX_SYMBOL,
    } from '@parser/Symbols';
    import HowToGalleryView from './howto/HowToGalleryView.svelte';
    import { localeGoto } from '@util/localeGoto';

    const user = getUser();

    // The current gallery being viewed. Starts at null, to represent loading state.
    let gallery = $state<Gallery | null | undefined>(null);
    /** Why there's no gallery, when there isn't one, so the notice below says
     *  what actually happened instead of inferring it from connection state. */
    let failure = $state<GalleryFailure | undefined>(undefined);
    const galleryID: string | undefined = page.params.galleryid
        ? decodeURI(page.params.galleryid)
        : undefined;

    // When the page changes, get the gallery store corresponding to the requested ID.
    $effect(() => {
        if (galleryID === undefined) {
            gallery = undefined;
            return;
        }

        // Re-run when the local cache hydrates, auth resolves, or the user's
        // gallery maps populate, so a gallery the user has access to resolves
        // from the cache (even offline) instead of flashing "not found".
        const hydrated = Galleries.hydrated;
        const authResolved = $authAttempted;
        const known =
            Galleries.accessibleGalleries.has(galleryID) ||
            Galleries.expandedScopeGalleries.has(galleryID);

        if (known) {
            // In the user's galleries — resolves from the local cache.
            Galleries.find(galleryID).then(receive);
        } else if (!hydrated || !authResolved) {
            // Still hydrating the cache or resolving auth — stay loading.
            gallery = null;
        } else {
            // Not one of the user's galleries; it may be a public gallery, which
            // requires a network read.
            Galleries.find(galleryID).then(receive);
        }
    });

    function receive(result: GalleryResult) {
        gallery = result.kind === 'found' ? result.gallery : undefined;
        failure = result.kind === 'found' ? undefined : result.kind;
    }

    let classes = $state<Class[] | undefined>(undefined);
    $effect(() => {
        // Listing classes requires auth, and the list links to /teach pages
        // only members can open, so a signed-out visitor must not ask. $user is
        // undefined until auth resolves, so this waits rather than asking early.
        if (gallery && $user) {
            getClasses(gallery.getID()).then((matches) => (classes = matches));
        }
    });

    // let galleryUnsubscribe: Unsubscriber | undefined = undefined;
    // let pageUnsubscribe = page.subscribe((context) => {
    //     const galleryID = context
    //         ? decodeURI(context.params.galleryid)
    //         : undefined;
    //     if (galleryID && !(gallery && gallery.getID() === galleryID)) {
    //         // Unsubscribe from the previous gallery store.
    //         if (galleryUnsubscribe) galleryUnsubscribe();
    //         Galleries.getStore(galleryID).then((store) => {
    //             // Found a store? Subscribe to it, updating the gallery when it changes.
    //             if (store) {
    //                 galleryUnsubscribe = store.subscribe((gal) => {
    //                     gallery = gal;
    //                 });
    //             }
    //             // Not found? No gallery.
    //             else gallery = undefined;
    //         });
    //     } else gallery = undefined;
    // });

    // onDestroy(() => pageUnsubscribe());

    let projects: Project[] | undefined = $state(undefined);

    /**
     * The characters shared in this gallery (#822).
     *
     * Read from the character cache by each character's own `gallery` field,
     * NOT from the gallery document's `characters` array. The character
     * document is the source of truth for membership — the array is the index
     * built from it — and the two are written in one batch but arrive
     * separately, so a share made a moment ago shows straight away instead of
     * waiting for the gallery document to come back. It's derived rather than
     * held in state because sharing updates a character the cache already
     * holds, so nothing about the cache's *size* changes.
     */
    let characters: Character[] | undefined = $derived(
        gallery
            ? CharactersDB.getGalleryCharacters(
                  gallery.getID(),
                  $locales.getLanguages(),
              )
            : undefined,
    );

    async function loadProjects() {
        if (gallery === undefined || gallery === null) return;
        projects = (
            await Promise.all(
                gallery
                    .getProjects()
                    .map(async (projectID) =>
                        (await DB.loadProjects()).get(projectID),
                    ),
            )
        ).filter((proj): proj is Project => proj !== undefined);
    }
    let name = $derived(gallery?.getName($locales));
    let description = $derived(gallery?.getDescription($locales));
    let editable = $derived(
        gallery
            ? isAuthenticated($user) &&
                  gallery.getCurators().includes($user.uid)
            : false,
    );
    let projectsEditable = $derived(
        isAuthenticated($user) &&
            !!gallery &&
            (gallery.hasCurator($user.uid) || gallery.hasCreator($user.uid)),
    );

    let addable = $derived(
        gallery && $user ? gallery.getCreators().includes($user.uid) : false,
    );
    // Anytime the gallery changes, refresh the project list.
    $effect(() => {
        if (gallery) loadProjects();
    });

    // Pull in any of this gallery's characters the cache doesn't hold. A
    // member's chunk listener streams them, but a visitor to a public gallery
    // has no listener at all, so the ones they can read have to be fetched.
    // getByID caches both a hit and a miss, so this never re-asks.
    $effect(() => {
        if (!gallery) return;
        for (const characterID of gallery.getCharacters())
            if (CharactersDB.byID.get(characterID) === undefined)
                void CharactersDB.getByID(characterID);
    });

    /** Which settings tab is showing; see `ui.gallery.tab`. Creators first:
     *  who may add work here is the setting a curator changes most. */
    let settingsTab = $state(0);

    /** The character whose reference was just copied, so its button can
     *  confirm. One at a time, since only one press is ever the latest. */
    let copiedCharacter = $state<string | undefined>(undefined);

    /** Put `@username/Name` on the clipboard, which is how a character is
     *  reused: paste it into a text literal in your own project. */
    function copyReference(character: Character) {
        copiedCharacter = undefined;
        toClipboard(`@${character.name}`);
        // Re-show the tick when the same button is pressed twice.
        setTimeout(() => (copiedCharacter = character.id), 100);
    }

    /** Whether to offer to have this character reviewed: only to someone
     *  signed in who didn't make it, and only where somebody is responsible
     *  for reviewing it — the server decides that from its visibility, so this
     *  asks the same question with the same function. */
    function reportable(character: Character) {
        return (
            isAuthenticated($user) &&
            character.owner !== $user.uid &&
            getResponsibility(
                characterVisibility(character, gallery ?? undefined),
            ).kind !== 'none'
        );
    }

    /** Whether the signed-in creator may edit this character themselves. */
    function canEditCharacter(character: Character) {
        return (
            isAuthenticated($user) &&
            (character.owner === $user.uid ||
                character.collaborators.includes($user.uid))
        );
    }
</script>

<!-- Outside the loading branch, so the document always has a title: axe's
     document-title rule fails a page that has none, and this route had none in
     any state. Named for the section plus this gallery, the way the character
     editor titles itself. -->
<svelte:head>
    <Title
        text={(l) => l.ui.page.galleries.header}
        subtitle={gallery ? gallery.getName($locales) : undefined}
    />
</svelte:head>

{#snippet addProject()}
    <AddProject
        inline
        add={async (template) => {
            if (gallery) {
                const newProjectID = (await DB.loadProjects()).copy(
                    template,
                    $user?.uid ?? null,
                    gallery.getID(),
                );
                Galleries.edit(gallery.withProject(newProjectID));
                localeGoto(`/project/${newProjectID}`);
            }
        }}
    />
{/snippet}

{#snippet addCharacter()}
    {#if gallery}<NewCharacterButton inline gallery={gallery.getID()} />{/if}
{/snippet}

{#if gallery === null}
    <Loading />
{:else}
    <Writing wide>
        {#if gallery === undefined}
            <!-- The lookup reports which of these happened, so a read that
                 timed out no longer misreports an accessible gallery as
                 nonexistent. -->
            <PageHeader />
            <Notice
                text={(l) =>
                    failure === 'unreachable'
                        ? l.ui.gallery.error.unreachable
                        : l.ui.gallery.error.unknown}
            />
        {:else}
            <PageHeader wrap
                >{#snippet title()}{#if editable}<TextField
                            id="gallery-name"
                            text={name ?? ''}
                            description={(l) =>
                                l.ui.gallery.field.name.description}
                            placeholder={(l) =>
                                l.ui.gallery.field.name.placeholder}
                            max="8em"
                            maxlength={MAX_NAME_LENGTH}
                            done={(text) =>
                                gallery
                                    ? Galleries.edit(
                                          gallery.withName(
                                              text,
                                              $locales.getLocale(),
                                          ),
                                      )
                                    : undefined}
                        />{:else if name}{name}{:else}<LocalizedText
                            path={(l) => l.ui.gallery.field.name.placeholder}
                        />{/if}{/snippet}</PageHeader
            >
            {#if !editable}<MarkupHTMLView
                    markup={description
                        ? description.split('\n').join('\n\n')
                        : (l) => l.ui.gallery.field.description.placeholder}
                />{:else}
                <TextBox
                    id="gallery-description"
                    text={description ?? ''}
                    maxlength={MAX_DESCRIPTION_LENGTH}
                    description={(l) =>
                        l.ui.gallery.field.description.description}
                    placeholder={(l) =>
                        l.ui.gallery.field.description.placeholder}
                    done={(text) =>
                        gallery
                            ? Galleries.edit(
                                  gallery.withDescription(
                                      text,
                                      $locales.getLocale(),
                                  ),
                              )
                            : undefined}
                />
            {/if}

            <HeaderAndExplanation
                text={(l) => l.ui.gallery.subheader.projects}
                sub
                controls={editable || addable ? addProject : undefined}
            />

            {#if projects}
                <ProjectPreviewSet
                    set={projects}
                    anonymize={!projectsEditable}
                    showCollaborators={projectsEditable}
                    edit={projectsEditable
                        ? {
                              description: (l) =>
                                  l.ui.page.projects.button.editproject,
                              action: (project) =>
                                  localeGoto(project.getLink(false)),
                              label: EDIT_SYMBOL,
                          }
                        : {
                              description: (l) =>
                                  l.ui.page.projects.button.viewproject,
                              action: (project) =>
                                  localeGoto(project.getLink(false)),
                              label: '👁️',
                          }}
                    copy={{
                        description: (l) => l.ui.project.button.remix.tip,
                        action: async (project) =>
                            localeGoto(
                                (await DB.loadProjects())
                                    .remix(project)
                                    .getLink(false),
                            ),
                        label: REMIX_SYMBOL,
                    }}
                    remove={(project) => {
                        return editable
                            ? {
                                  prompt: (l) =>
                                      l.ui.gallery.confirm.remove.prompt,
                                  description: (l) =>
                                      l.ui.gallery.confirm.remove.description,

                                  action: () =>
                                      gallery
                                          ? Galleries.removeProject(
                                                project,
                                                gallery.getID(),
                                            )
                                          : false,
                                  label: CANCEL_SYMBOL,
                              }
                            : false;
                    }}
                />
            {:else}
                <PreviewPlaceholder />
            {/if}

            <!-- Characters shared here (#822). Shown to members always, so
                 they have somewhere to add one; to everyone else only when
                 there is something to see. -->
            {#if projectsEditable || (characters && characters.length > 0)}
                <HeaderAndExplanation
                    text={(l) => l.ui.gallery.subheader.characters}
                    sub
                    controls={editable || addable ? addCharacter : undefined}
                />

                {#if characters}
                    <div class="characters">
                        {#each characters as character (character.id)}
                            <CharacterPreview {character}>
                                {#snippet controls()}
                                    {#if canEditCharacter(character)}
                                        <Button
                                            tip={(l) =>
                                                l.ui.gallery.button
                                                    .editcharacter}
                                            icon={EDIT_SYMBOL}
                                            background
                                            action={() =>
                                                localeGoto(
                                                    `/character/${character.id}`,
                                                )}
                                        ></Button>
                                    {/if}
                                    <Button
                                        tip={(l) =>
                                            l.ui.page.characters.button.copy}
                                        icon={REMIX_SYMBOL}
                                        background
                                        action={async () => {
                                            const id =
                                                await CharactersDB.copy(
                                                    character,
                                                );
                                            if (id)
                                                localeGoto(`/character/${id}`);
                                        }}
                                    ></Button>
                                    <Button
                                        tip={copiedCharacter === character.id
                                            ? (l) => l.ui.gallery.button.copied
                                            : (l) =>
                                                  l.ui.gallery.button
                                                      .copyreference}
                                        icon={copiedCharacter === character.id
                                            ? CONFIRM_SYMBOL
                                            : PASTE_SYMBOL}
                                        background
                                        action={() => copyReference(character)}
                                    ></Button>
                                    <!-- Someone else's drawing, in a space
                                         with other people in it, is the one
                                         case where there is anyone to ask
                                         (#1236). Responsibility is derived
                                         server-side from what the character
                                         can reach; this only offers to ask. -->
                                    {#if reportable(character)}
                                        <ReportButton
                                            kind="character"
                                            subject={character.id}
                                            name={bareCharacterName(character)}
                                        />
                                    {/if}
                                    {#if editable}
                                        <ConfirmButton
                                            tip={(l) =>
                                                l.ui.gallery.confirm
                                                    .removecharacter
                                                    .description}
                                            prompt={(l) =>
                                                l.ui.gallery.confirm
                                                    .removecharacter.prompt}
                                            icon={CANCEL_SYMBOL}
                                            background
                                            enabled={!$disconnected}
                                            action={() =>
                                                gallery
                                                    ? Galleries.removeCharacter(
                                                          character,
                                                          gallery.getID(),
                                                      )
                                                    : undefined}
                                        ></ConfirmButton>
                                    {/if}
                                {/snippet}
                            </CharacterPreview>
                        {/each}
                    </div>
                {:else}
                    <PreviewPlaceholder />
                {/if}
            {/if}

            {#if classes && classes.length > 0}
                <HeaderAndExplanation
                    text={(l) => l.ui.gallery.subheader.classes}
                    sub
                />

                <ul>
                    {#each classes as classy}
                        <li
                            ><Link to="/teach/class/{classy.id}"
                                >{classy.name}</Link
                            ></li
                        >
                    {/each}
                </ul>
            {/if}

            {#if !gallery.isBuiltIn()}
                <Subheader text={(l) => l.ui.howto.galleryView.header}
                ></Subheader>
                <MarkupHTMLView markup={(l) => l.ui.howto.galleryView.prompt} />
                <HowToGalleryView {gallery} {projectsEditable} />
            {/if}

            <!-- Who may add work here, who manages it, who can see it, and
                 whether it exists are settings rather than content, so they
                 sit together at the end in tabs instead of four more sections
                 competing with the projects and characters above. Visibility
                 and delete are the curator's alone, so they're omitted rather
                 than disabled for anyone else. -->
            {#if editable || gallery.getCreators().length > 0 || gallery.getCurators().length > 0}
                <!-- Captured because a snippet body is its own scope, so the
                     narrowing that made `gallery` non-null out here doesn't
                     reach inside the panels below. -->
                {@const settings = gallery}
                <div class="settings">
                    <Tabbed
                        id="gallery-settings-tabs"
                        tabs={(l) => l.ui.gallery.tab}
                        choice={settingsTab}
                        select={(choice) => (settingsTab = choice)}
                        omit={editable ? [] : [2, 3]}
                    >
                        {#snippet children()}
                            <!-- No headers in any panel: the tab already names it. -->
                            {#if settingsTab === 0}
                                <MarkupHTMLView
                                    markup={(l) =>
                                        l.ui.gallery.subheader.creators
                                            .explanation}
                                />
                                <CreatorList
                                    id="creator-to-add"
                                    anonymize={!editable}
                                    uids={settings.getCreators()}
                                    {editable}
                                    add={(userID) =>
                                        settings
                                            ? Galleries.edit(
                                                  settings.withCreator(userID),
                                              )
                                            : undefined}
                                    remove={(userID) =>
                                        settings
                                            ? Galleries.removeCreator(
                                                  settings,
                                                  userID,
                                              )
                                            : undefined}
                                    removable={() => true}
                                />
                            {:else if settingsTab === 1}
                                <MarkupHTMLView
                                    markup={(l) =>
                                        l.ui.gallery.subheader.curators
                                            .explanation}
                                />
                                <CreatorList
                                    id="curator-to-add"
                                    uids={settings.getCurators()}
                                    anonymize={!editable}
                                    {editable}
                                    add={(userID) =>
                                        settings
                                            ? Galleries.edit(
                                                  settings.withCurator(userID),
                                              )
                                            : undefined}
                                    remove={(userID) =>
                                        settings
                                            ? Galleries.removeCurator(
                                                  settings,
                                                  userID,
                                              )
                                            : undefined}
                                    removable={(uid) =>
                                        settings
                                            ? settings.getCurators().length >
                                                  0 &&
                                              $user !== null &&
                                              $user !== undefined &&
                                              $user.uid !== uid
                                            : false}
                                />
                            {:else if settingsTab === 2}
                                <Public
                                    isPublic={settings.isPublic()}
                                    header={false}
                                    set={(choice) => {
                                        settings
                                            ? Galleries.edit(
                                                  settings.asPublic(
                                                      choice === 1,
                                                  ),
                                              )
                                            : undefined;
                                    }}
                                    visibility={galleryVisibility(settings)}
                                />
                                <!-- Below the control, not above it: where a
                                 gallery stands with the moderators is the
                                 consequence of the choice made right here. -->
                                <GalleryModerationNotice gallery={settings} />
                            {:else}
                                <MarkupHTMLView
                                    markup={(l) =>
                                        l.ui.gallery.subheader.delete
                                            .explanation}
                                />
                                <p>
                                    <ConfirmButton
                                        background
                                        tip={(l) =>
                                            l.ui.gallery.confirm.delete
                                                .description}
                                        prompt={(l) =>
                                            l.ui.gallery.confirm.delete.prompt}
                                        enabled={!$disconnected}
                                        action={async () => {
                                            if (settings) {
                                                await Galleries.delete(
                                                    settings,
                                                );
                                                localeGoto('/galleries');
                                            }
                                        }}
                                        label={(l) =>
                                            l.ui.gallery.confirm.delete.prompt}
                                    />
                                </p>
                            {/if}
                        {/snippet}
                    </Tabbed>
                </div>
            {/if}
        {/if}
    </Writing>
{/if}

<style>
    /* Settings follow the last content section, so they need the space above
       them that a section header gives itself. */
    .settings {
        margin-block-start: 1.5em;
    }

    /* A grid rather than the wrapping flex the characters page uses: a class
       gallery holds many more drawings than one creator's page does, and a
       grid keeps their inline-start aligned across rows the way
       ProjectPreviewSet does for projects. */
    .characters {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
        column-gap: calc(var(--wordplay-spacing) * 2);
        row-gap: calc(var(--wordplay-spacing) * 2);
        align-items: start;
        justify-items: start;
    }
</style>
