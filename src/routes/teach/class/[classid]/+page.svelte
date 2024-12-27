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
        field: {
            /** Add a teacher */
            newteacher: FieldText;
            /** Add a teacher button */
            addteacher: string;
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
    import CreatorList from '@components/project/CreatorList.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { Creator } from '@db/CreatorDatabase';
    import { Galleries, locales } from '@db/Database';
    import { getClass, setClass, type Class } from '@db/TeacherDatabase.svelte';
    import type { FieldText } from '@locale/UITexts';
    import { getTeachData } from '../../+layout.svelte';

    let teach = getTeachData();
    let classData = $derived(teach.getClass(page.params.classid));
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

    async function removeTeacher(group: Class, uid: string) {
        setClass({
            ...group,
            teachers: group.teachers.filter((teacher) => teacher !== uid),
        });
    }

    async function addTeacher(group: Class, uid: string) {
        setClass({
            ...group,
            teachers: [...group.teachers, uid],
        });
    }
</script>

<Writing>
    {#if classData === undefined}
        <Header>{$locales.get((l) => l.ui.page.class.header)}</Header>
        <Feedback
            >{$locales.get((l) => l.ui.page.class.error.notfound)}</Feedback
        >
    {:else}
        <Header>{classData.name}</Header>
        <p>{classData.description}</p>

        <Subheader
            >{$locales.get(
                (l) => l.ui.page.class.subheader.teachers,
            )}</Subheader
        >

        <!-- Show all the teachers and allow them to be added and removed. -->
        <CreatorList
            uids={classData.teachers}
            add={(uid) => addTeacher(classData, uid)}
            remove={(uid) => removeTeacher(classData, uid)}
            removable={() => classData.teachers.length > 1}
            editable={true}
            anonymize={false}
        ></CreatorList>

        <Subheader
            >{$locales.get(
                (l) => l.ui.page.class.subheader.students,
            )}</Subheader
        >
        <table>
            <tbody>
                {#each classData.info as student}
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
                tip={$locales.get((l) => l.ui.page.projects.button.newgallery)}
                action={() => createGallery(classData)}
                ><span style:font-size="xxx-large">+</span>
            </Button>
        </Centered>

        {#if newGalleryError}
            <Feedback
                >{$locales.get((l) => l.ui.page.class.error.gallery)}</Feedback
            >
        {/if}

        {#each classData.galleries as gallery, index}
            {#await Galleries.get(gallery)}
                <Spinning></Spinning>
            {:then gallery}
                {#if gallery}
                    <GalleryPreview {gallery} delay={index * 1000} />
                {/if}
            {/await}
        {/each}
    {/if}
</Writing>
