<script lang="ts">
    import { page } from '$app/stores';
    import Feedback from '@components/app/Feedback.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { Galleries, Projects, locale } from '@db/Database';
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
    import { locales } from '@db/Database';

    const user = getUser();

    // The current gallery being viewed. Starts at null, to represent loading state.
    let gallery: Gallery | null | undefined = null;

    // When the page changes, get the gallery store corresponding to the requested ID.
    let galleryUnsubscribe: Unsubscriber | undefined = undefined;
    let pageUnsubscribe = page.subscribe((context) => {
        const galleryID = context
            ? decodeURI(context.params.galleryid)
            : undefined;
        if (galleryID) {
            // Unsubscribe from the previous gallery store.
            if (galleryUnsubscribe) galleryUnsubscribe();
            Galleries.getStore(galleryID).then((store) => {
                // Found a store? Subscribe to it, updating the gallery when it changes.
                if (store) {
                    galleryUnsubscribe = store.subscribe(
                        (gal) => (gallery = gal)
                    );
                }
                // Not found? No gallery.
                else gallery = undefined;
            });
        } else gallery = undefined;
    });

    onDestroy(() => pageUnsubscribe());

    $: name = gallery?.getName($locale);
    $: description = gallery?.getDescription($locale);
    $: editable = gallery
        ? $user !== null && gallery.getCurators().includes($user.uid)
        : false;

    // Anytime the gallery changes, refresh the project list.
    let projects: Project[] | undefined = undefined;
    $: if (gallery) {
        Promise.all(gallery.getProjects().map((id) => Projects.get(id))).then(
            (results) =>
                (projects = results.filter(
                    (result): result is Project => result !== undefined
                ))
        );
    } else projects = undefined;

    function newProject() {
        if (gallery === undefined || gallery === null) return;
        // Add the new project
        const newProjectID = Projects.create(
            $locales,
            $locale.newProject,
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
            <Feedback>{$locale.ui.gallery.error.unknown}</Feedback>
        {:else}
            <Header
                >{#if editable}<TextField
                        text={name ?? ''}
                        description={$locale.ui.gallery.field.name.description}
                        placeholder={$locale.ui.gallery.field.name.placeholder}
                        done={(text) =>
                            gallery
                                ? Galleries.edit(
                                      gallery.withName(text, $locale)
                                  )
                                : undefined}
                    />{:else if name}{name}{:else}{$locale.ui.gallery.field.name
                        .placeholder}{/if}</Header
            >
            <div class="collection">
                {#if !editable}<MarkupHtmlView
                        markup={description
                            ? description.split('\n').join('\n\n')
                            : $locale.ui.gallery.field.description.placeholder}
                    />{:else}
                    <TextBox
                        text={description ?? ''}
                        description={$locale.ui.gallery.field.description
                            .description}
                        placeholder={$locale.ui.gallery.field.description
                            .placeholder}
                        done={(text) =>
                            gallery
                                ? Galleries.edit(
                                      gallery.withDescription(text, $locale)
                                  )
                                : undefined}
                    />
                {/if}

                {#if projects}
                    <ProjectPreviewSet
                        set={projects}
                        remove={{
                            prompt: $locale.ui.gallery.confirm.remove.prompt,
                            description:
                                $locale.ui.gallery.confirm.remove.description,
                            action: (project) =>
                                gallery
                                    ? Galleries.removeProject(project)
                                    : undefined,
                            label: '⨉',
                        }}
                    />
                {/if}

                {#if editable}
                    <Button
                        tip={$locale.ui.page.projects.button.newproject}
                        action={newProject}
                        ><span style:font-size="xxx-large">+</span>
                    </Button>
                {/if}
            </div>

            {#if editable || gallery.getCurators().length > 0}
                <Subheader
                    >{$locale.ui.gallery.subheader.curators.header}</Subheader
                >
                <MarkupHtmlView
                    markup={$locale.ui.gallery.subheader.curators.explanation}
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
                    >{$locale.ui.gallery.subheader.creators.header}</Subheader
                >
                <MarkupHtmlView
                    markup={$locale.ui.gallery.subheader.creators.explanation}
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
                    >{$locale.ui.gallery.subheader.delete.header}</Subheader
                >
                <MarkupHtmlView
                    markup={$locale.ui.gallery.subheader.delete.explanation}
                />

                <p>
                    <ConfirmButton
                        background
                        tip={$locale.ui.gallery.confirm.delete.description}
                        prompt={$locale.ui.gallery.confirm.delete.prompt}
                        action={async () => {
                            if (gallery) {
                                await Galleries.delete(gallery);
                                goto('/projects');
                            }
                        }}
                        >{$locale.ui.gallery.confirm.delete
                            .prompt}</ConfirmButton
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
