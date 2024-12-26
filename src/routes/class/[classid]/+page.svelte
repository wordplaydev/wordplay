<script module lang="ts">
    export type ClassText = {
        /** Header for the class page*/
        header: string;
        subheader: {
            /** The teachers header */
            teachers: string;
            /** The student header */
            students: string;
            /** The galleries header */
            galleries: string;
        };
        prompt: {
            /** Encourage galleries */
            gallery: string;
        };
        error: {
            /** Couldn't find the requested class */
            notfound: string;
            /** Couldn't create a gallery*/
            gallery: string;
        };
    };
</script>

<script lang="ts">
    import { goto } from '$app/navigation';

    import { page } from '$app/state';
    import Centered from '@components/app/Centered.svelte';
    import CreatorView from '@components/app/CreatorView.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';

    import Header from '@components/app/Header.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { Creator } from '@db/CreatorDatabase';
    import { Creators, Galleries, locales } from '@db/Database';
    import { getClass, type Class } from '@db/TeacherDatabase.svelte';

    let newGalleryError = $state(false);

    async function createGallery(group: Class) {
        newGalleryError = false;
        try {
            const newGalleryID = await Galleries.create(
                $locales,
                group.teachers,
                group.learners,
                page.params.classid,
            );
            goto(`/gallery/${newGalleryID}`);
        } catch (error) {
            console.error(error);
            newGalleryError = true;
        }
    }
</script>

<Writing>
    {#await getClass(page.params.classid)}
        <Header>{$locales.get((l) => l.ui.page.class.header)}</Header>
        <Spinning></Spinning>
    {:then group}
        {#if group === undefined}
            <Header>{$locales.get((l) => l.ui.page.class.header)}</Header>
            <Feedback
                >{$locales.get((l) => l.ui.page.class.error.notfound)}</Feedback
            >
        {:else}
            <Header>{group.name}</Header>
            <p>{group.description}</p>

            <Subheader
                >{$locales.get(
                    (l) => l.ui.page.class.subheader.teachers,
                )}</Subheader
            >

            <div class="flow">
                {#await Creators.getCreatorsByUIDs(group.teachers) then creators}
                    {#each Object.values(creators) as creator}
                        <CreatorView {creator} anonymize={false} />
                    {/each}
                {/await}
            </div>

            <Subheader
                >{$locales.get(
                    (l) => l.ui.page.class.subheader.students,
                )}</Subheader
            >
            <table>
                <tbody>
                    {#each group.info as student}
                        <tr>
                            <td>
                                <CreatorView
                                    creator={new Creator({
                                        uid: student.uid,
                                        name: '',
                                        email: Creator.usernameEmail(
                                            student.username,
                                        ),
                                    })}
                                    anonymize={false}
                                />
                            </td>
                            {#each student.meta as info}
                                <td>{info}</td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>

            <Subheader
                >{$locales.get(
                    (l) => l.ui.page.class.subheader.galleries,
                )}</Subheader
            >

            <MarkupHtmlView
                markup={$locales.get((l) => l.ui.page.class.prompt.gallery)}
            />

            <Centered>
                <Button
                    tip={$locales.get(
                        (l) => l.ui.page.projects.button.newgallery,
                    )}
                    action={() => createGallery(group)}
                    ><span style:font-size="xxx-large">+</span>
                </Button>
            </Centered>

            {#if newGalleryError}
                <Feedback
                    >{$locales.get(
                        (l) => l.ui.page.class.error.gallery,
                    )}</Feedback
                >
            {/if}

            {#each group.galleries as gallery, index}
                {#await Galleries.get(gallery)}
                    <Spinning></Spinning>
                {:then gallery}
                    {#if gallery}
                        <GalleryPreview {gallery} delay={index * 1000} />
                    {/if}
                {/await}
            {/each}
        {/if}
    {:catch}
        <Header>{$locales.get((l) => l.ui.page.class.header)}</Header>
        <Feedback
            >{$locales.get((l) => l.ui.page.class.error.notfound)}</Feedback
        >
    {/await}
</Writing>

<style>
    .flow {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }
</style>
