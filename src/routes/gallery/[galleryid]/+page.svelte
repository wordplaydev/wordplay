<script module lang="ts">
    import type { DialogText } from '@locale/UITexts';
    import type { ConfirmText } from '@locale/UITexts';
    import type { FieldText } from '@locale/UITexts';

    export type GalleryPageText = {
        /** What to call a gallery by default, before it's given a name */
        untitled: string;
        /** What to say if the description is empty */
        undescribed: string;
        /** Headers on the page */
        subheader: {
            /** Associtaed classes header */
            classes: DialogText;
            /** The list of curators */
            curators: DialogText;
            /** The list of curators */
            creators: DialogText;
            /** Delete header */
            delete: DialogText;
        };
        /** Confirm buttons on the gallery page */
        confirm: {
            /** The confirm button that deletes a source file */
            delete: ConfirmText;
            /** The confirm button that removes a project from a gallery */
            remove: ConfirmText;
        };
        error: {
            /** When the gallery is not known or is not public */
            unknown: string;
        };
        field: {
            name: FieldText;
            description: FieldText;
        };
    };
</script>

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
    import type Gallery from '@db/galleries/Gallery';
    import Public from '@components/project/Public.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import type Project from '../../../db/projects/Project';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import AddProject from '@components/app/AddProject.svelte';
    import {
        CANCEL_SYMBOL,
        COPY_SYMBOL,
        EDIT_SYMBOL,
    } from '../../../parser/Symbols';
    import Spinning from '@components/app/Spinning.svelte';
    import { getClasses, type Class } from '@db/TeacherDatabase.svelte';
    import Link from '@components/app/Link.svelte';

    const user = getUser();

    // The current gallery being viewed. Starts at null, to represent loading state.
    let gallery = $state<Gallery | null | undefined>(null);

    // When the page changes, get the gallery store corresponding to the requested ID.
    $effect(() => {
        const galleryID = decodeURI($page.params.galleryid);
        Galleries.get(galleryID).then((gal) => {
            // Found a store? Subscribe to it, updating the gallery when it changes.
            if (gal) gallery = gal;
            // Not found? No gallery.
            else gallery = undefined;
        });
    });

    let classes = $state<Class[] | undefined>(undefined);
    $effect(() => {
        if (gallery) {
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

    async function loadProjects() {
        if (gallery === undefined || gallery === null) return;
        projects = (
            await Promise.all(
                gallery
                    .getProjects()
                    .map((projectID) => Projects.get(projectID)),
            )
        ).filter((proj): proj is Project => proj !== undefined);
    }
    let name = $derived(gallery?.getName($locales));
    let description = $derived(gallery?.getDescription($locales));
    let editable = $derived(
        gallery
            ? $user !== null && gallery.getCurators().includes($user.uid)
            : false,
    );
    let projectsEditable = $derived(
        $user !== null &&
            gallery &&
            (gallery.hasCurator($user.uid) || gallery.hasCreator($user.uid)),
    );
    let addable = $derived(
        gallery && $user ? gallery.getCreators().includes($user.uid) : false,
    );
    // Anytime the gallery changes, refresh the project list.
    $effect(() => {
        if (gallery) loadProjects();
    });
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
                            (l) => l.ui.gallery.field.name.description,
                        )}
                        placeholder={$locales.get(
                            (l) => l.ui.gallery.field.name.placeholder,
                        )}
                        done={(text) =>
                            gallery
                                ? Galleries.edit(
                                      gallery.withName(
                                          text,
                                          $locales.getLocale(),
                                      ),
                                  )
                                : undefined}
                    />{:else if name}{name}{:else}{$locales.get(
                        (l) => l.ui.gallery.field.name.placeholder,
                    )}{/if}</Header
            >
            <div class="collection">
                {#if !editable}<MarkupHtmlView
                        markup={description
                            ? description.split('\n').join('\n\n')
                            : $locales.get(
                                  (l) =>
                                      l.ui.gallery.field.description
                                          .placeholder,
                              )}
                    />{:else}
                    <TextBox
                        text={description ?? ''}
                        description={$locales.get(
                            (l) => l.ui.gallery.field.description.description,
                        )}
                        placeholder={$locales.get(
                            (l) => l.ui.gallery.field.description.placeholder,
                        )}
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

                {#if editable || addable}
                    <AddProject
                        add={(template) => {
                            if (gallery) {
                                const newProjectID = Projects.copy(
                                    template,
                                    $user?.uid ?? null,
                                    gallery.getID(),
                                );
                                Galleries.edit(
                                    gallery.withProject(newProjectID),
                                );
                                goto(`/project/${newProjectID}`);
                            }
                        }}
                    />
                {/if}

                {#if projects}
                    <ProjectPreviewSet
                        set={projects}
                        edit={projectsEditable
                            ? {
                                  description: $locales.get(
                                      (l) =>
                                          l.ui.page.projects.button.editproject,
                                  ),
                                  action: (project) =>
                                      goto(project.getLink(false)),
                                  label: EDIT_SYMBOL,
                              }
                            : false}
                        copy={{
                            description: $locales.get(
                                (l) => l.ui.project.button.duplicate,
                            ),
                            action: (project) =>
                                goto(
                                    Projects.duplicate(project).getLink(false),
                                ),
                            label: COPY_SYMBOL,
                        }}
                        remove={(project) => {
                            return editable
                                ? {
                                      prompt: $locales.get(
                                          (l) =>
                                              l.ui.gallery.confirm.remove
                                                  .prompt,
                                      ),
                                      description: $locales.get(
                                          (l) =>
                                              l.ui.gallery.confirm.remove
                                                  .description,
                                      ),
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
                    <Spinning large />
                {/if}
            </div>

            {#if editable || gallery.getCurators().length > 0}
                <Subheader
                    >{$locales.get(
                        (l) => l.ui.gallery.subheader.curators.header,
                    )}</Subheader
                >
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.gallery.subheader.curators.explanation,
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
                        (l) => l.ui.gallery.subheader.creators.header,
                    )}</Subheader
                >
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.gallery.subheader.creators.explanation,
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

            {#if classes}
                <Subheader
                    >{$locales.get(
                        (l) => l.ui.gallery.subheader.classes.header,
                    )}</Subheader
                >
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.gallery.subheader.classes.explanation,
                    )}
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
                        (l) => l.ui.gallery.subheader.delete.header,
                    )}</Subheader
                >
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.gallery.subheader.delete.explanation,
                    )}
                />

                <p>
                    <ConfirmButton
                        background
                        tip={$locales.get(
                            (l) => l.ui.gallery.confirm.delete.description,
                        )}
                        prompt={$locales.get(
                            (l) => l.ui.gallery.confirm.delete.prompt,
                        )}
                        action={async () => {
                            if (gallery) {
                                await Galleries.delete(gallery);
                                goto('/projects');
                            }
                        }}
                        >{$locales.get(
                            (l) => l.ui.gallery.confirm.delete.prompt,
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
