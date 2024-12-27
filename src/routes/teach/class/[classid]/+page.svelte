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
            /** The name of the class */
            name: FieldText;
            /** The description of the class */
            description: FieldText;
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
    import Feedback from '@components/app/Feedback.svelte';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';

    import Header from '@components/app/Header.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { Galleries, locales } from '@db/Database';
    import {
        addStudent,
        addTeacher,
        removeStudent,
        removeTeacher,
        setClass,
        type Class,
    } from '@db/TeacherDatabase.svelte';
    import type { FieldText } from '@locale/UITexts';
    import { getTeachData } from '../../+layout.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import { getUser } from '@components/project/Contexts';
    import Link from '@components/app/Link.svelte';
    import { PREVIOUS_SYMBOL } from '@parser/Symbols';

    let teach = getTeachData();
    let classData = $derived(teach.getClass(page.params.classid));
    let newGalleryError = $state(false);
    let user = getUser();
    let editable = $derived(
        $user && classData && classData.teachers.includes($user.uid),
    );

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

    function updateName(name: string) {
        if (classData) setClass({ ...classData, name: name });
    }

    function updateDescription(description: string) {
        if (classData) setClass({ ...classData, description: description });
    }
</script>

<Writing>
    <Link to="/teach"
        >{PREVIOUS_SYMBOL} {$locales.get((l) => l.ui.page.teach.header)}</Link
    >
    {#if classData === null}
        <Header>{$locales.get((l) => l.ui.page.class.header)}</Header>
        <Feedback
            >{$locales.get((l) => l.ui.page.class.error.notfound)}</Feedback
        >
    {:else if classData === undefined}
        <Spinning></Spinning>
    {:else}
        <Header
            >{#if editable}<TextBox
                    text={classData.name}
                    description={$locales.get(
                        (l) => l.ui.page.class.field.name.description,
                    )}
                    placeholder={$locales.get(
                        (l) => l.ui.page.class.field.name.placeholder,
                    )}
                    dwelled={updateName}
                    done={updateName}
                />{:else}{classData.name}{/if}</Header
        >
        <p
            >{#if editable}
                <TextBox
                    text={classData.description}
                    description={$locales.get(
                        (l) => l.ui.page.class.field.description.description,
                    )}
                    placeholder={$locales.get(
                        (l) => l.ui.page.class.field.description.placeholder,
                    )}
                    dwelled={updateDescription}
                    done={updateDescription}
                />
            {:else}
                {classData.description}
            {/if}</p
        >

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

        <CreatorList
            uids={classData.learners}
            add={(uid, username) => addStudent(classData, uid, username)}
            remove={(uid) => removeStudent(classData, uid)}
            removable={() => classData.learners.length > 1}
            editable={true}
            anonymize={false}
            metadata={new Map(
                classData.info.map((info) => [info.uid, info.meta]),
            )}
        ></CreatorList>

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
