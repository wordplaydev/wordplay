<script lang="ts">
    import { page } from '$app/stores';
    import Feedback from '@components/app/Feedback.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { Galleries, Projects, locales } from '@db/Database';
    import Header from '@components/app/Header.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { goto } from '$app/navigation';
    import Subheader from '@components/app/Subheader.svelte';
    import { getUser } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import type { Unsubscriber } from 'svelte/store';
    import type Gallery from '@models/Gallery';
    import { onDestroy } from 'svelte';
    import Public from '@components/project/Public.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import type Project from '../../../models/Project';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import Button from '../../../components/widgets/Button.svelte';
    import { EDIT_SYMBOL } from '../../../parser/Symbols';
    import Spinning from '@components/app/Spinning.svelte';

    const user = getUser();

    // The current gallery being viewed. Starts at null, to represent loading state.
    let gallery: Gallery | null | undefined = null;

    // When the page changes, get the gallery store corresponding to the requested ID.
    let galleryUnsubscribe: Unsubscriber | undefined = undefined;
    let pageUnsubscribe = page.subscribe((context) => {
        const galleryID = context
            ? decodeURI(context.params.galleryid)
            : undefined;
        if (galleryID && !(gallery && gallery.getID() === galleryID)) {
            // Unsubscribe from the previous gallery store.
            if (galleryUnsubscribe) galleryUnsubscribe();
            Galleries.getStore(galleryID).then((store) => {
                // Found a store? Subscribe to it, updating the gallery when it changes.
                if (store) {
                    galleryUnsubscribe = store.subscribe((gal) => {
                        gallery = gal;
                    });
                }
                // Not found? No gallery.
                else gallery = undefined;
            });
        } else gallery = undefined;
    });

    onDestroy(() => pageUnsubscribe());

    $: name = gallery?.getName($locales);
    $: description = gallery?.getDescription($locales);
    $: editable = gallery
        ? $user !== null && gallery.getCurators().includes($user.uid)
        : false;

    // Anytime the gallery changes, refresh the project list.
    $: if (gallery) loadProjects();

    let projects: Project[] | undefined = undefined;

    async function loadProjects() {
        if (gallery === undefined || gallery === null) return;
        projects = (
            await Promise.all(
                gallery
                    .getProjects()
                    .map((projectID) => Projects.get(projectID))
            )
        ).filter((proj): proj is Project => proj !== undefined);
    }

    function newProject() {
        if (gallery === undefined || gallery === null) return;
        // Add the new project
        const newProjectID = Projects.create(
            $locales.getLocales(),
            $locales.getLocale().newProject,
            gallery.getID()
        );
        // Add it to this gallery.
        Galleries.edit(gallery.withProject(newProjectID));

        // Go to the project
        goto(`/project/${newProjectID}`);
    }
</script>

{#if gallery === null}
    <Loading />
{:else}
    <Writing>
        {#if gallery === undefined}
            <Feedback
                >{$locales.get((l) => l.ui.gallery.error.unknown)}</Feedback
            >
        {:else}
            <Header
                >{#if editable}<TextField
                        text={name ?? ''}
                        description={$locales.get(
                            (l) => l.ui.gallery.field.name.description
                        )}
                        placeholder={$locales.get(
                            (l) => l.ui.gallery.field.name.placeholder
                        )}
                        done={(text) =>
                            gallery
                                ? Galleries.edit(
                                      gallery.withName(
                                          text,
                                          $locales.getLocale()
                                      )
                                  )
                                : undefined}
                    />{:else if name}{name}{:else}{$locales.get(
                        (l) => l.ui.gallery.field.name.placeholder
                    )}{/if}</Header
            >
            <div class="collection">
                {#if !editable}<MarkupHtmlView
                        markup={description
                            ? description.split('\n').join('\n\n')
                            : $locales.get(
                                  (l) =>
                                      l.ui.gallery.field.description.placeholder
                              )}
                    />{:else}
                    <TextBox
                        text={description ?? ''}
                        description={$locales.get(
                            (l) => l.ui.gallery.field.description.description
                        )}
                        placeholder={$locales.get(
                            (l) => l.ui.gallery.field.description.placeholder
                        )}
                        done={(text) =>
                            gallery
                                ? Galleries.edit(
                                      gallery.withDescription(
                                          text,
                                          $locales.getLocale()
                                      )
                                  )
                                : undefined}
                    />
                {/if}

                {#if projects}
                    <ProjectPreviewSet
                        set={projects}
                        edit={editable
                            ? {
                                  description: $locales.get(
                                      (l) =>
                                          l.ui.page.projects.button.editproject
                                  ),
                                  action: (project) =>
                                      goto(project.getLink(false)),
                                  label: EDIT_SYMBOL,
                              }
                            : false}
                        remove={(project) => {
                            return editable
                                ? {
                                      prompt: $locales.get(
                                          (l) =>
                                              l.ui.gallery.confirm.remove.prompt
                                      ),
                                      description: $locales.get(
                                          (l) =>
                                              l.ui.gallery.confirm.remove
                                                  .description
                                      ),
                                      action: () =>
                                          gallery
                                              ? Galleries.removeProject(project)
                                              : undefined,
                                      label: '⨉',
                                  }
                                : false;
                        }}
                    />
                {:else}
                    <Spinning large />
                {/if}

                {#if editable}
                    <Button
                        tip={$locales.get(
                            (l) => l.ui.page.projects.button.newproject
                        )}
                        action={newProject}
                        ><span style:font-size="xxx-large">+</span>
                    </Button>
                {/if}
            </div>

            {#if editable || gallery.getCurators().length > 0}
                <Subheader
                    >{$locales.get(
                        (l) => l.ui.gallery.subheader.curators.header
                    )}</Subheader
                >
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.gallery.subheader.curators.explanation
                    )}
                />
                <CreatorList
                    uids={gallery.getCurators()}
                    anonymize={!editable}
                    {editable}
                    add={(userID) =>
                        gallery
                            ? Galleries.edit(gallery.withCurator(userID))
                            : undefined}
                    remove={(userID) =>
                        gallery
                            ? Galleries.removeCurator(gallery, userID)
                            : undefined}
                    removable={(uid) =>
                        gallery
                            ? gallery.getCurators().length > 0 &&
                              $user !== null &&
                              $user.uid !== uid
                            : false}
                />
            {/if}

            {#if editable || gallery.getCreators().length > 0}
                <Subheader
                    >{$locales.get(
                        (l) => l.ui.gallery.subheader.creators.header
                    )}</Subheader
                >
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.gallery.subheader.creators.explanation
                    )}
                />
                <CreatorList
                    anonymize={!editable}
                    uids={gallery.getCreators()}
                    {editable}
                    add={(userID) =>
                        gallery
                            ? Galleries.edit(gallery.withCreator(userID))
                            : undefined}
                    remove={(userID) =>
                        gallery
                            ? Galleries.removeCreator(gallery, userID)
                            : undefined}
                    removable={() => true}
                />
            {/if}

            {#if $user && gallery.getCurators().includes($user.uid)}
                <Public
                    isPublic={gallery.isPublic()}
                    set={(choice) => {
                        gallery
                            ? Galleries.edit(gallery.asPublic(choice === 1))
                            : undefined;
                    }}
                />
                <Subheader
                    >{$locales.get(
                        (l) => l.ui.gallery.subheader.delete.header
                    )}</Subheader
                >
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.gallery.subheader.delete.explanation
                    )}
                />

                <p>
                    <ConfirmButton
                        background
                        tip={$locales.get(
                            (l) => l.ui.gallery.confirm.delete.description
                        )}
                        prompt={$locales.get(
                            (l) => l.ui.gallery.confirm.delete.prompt
                        )}
                        action={async () => {
                            if (gallery) {
                                await Galleries.delete(gallery);
                                goto('/projects');
                            }
                        }}
                        >{$locales.get(
                            (l) => l.ui.gallery.confirm.delete.prompt
                        )}</ConfirmButton
                    >
                </p>
            {/if}
        {/if}
    </Writing>
{/if}

<style>
    .collection {
        display: flex;
        flex-direction: column;
        margin-block-start: 1em;
        gap: 2em;
    }
</style>
