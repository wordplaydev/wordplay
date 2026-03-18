<script lang="ts">
    import { goto } from '$app/navigation';

    import { page } from '$app/state';
    import Centered from '@components/app/Centered.svelte';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import { Galleries, locales } from '@db/Database';
    import {
        addStudent,
        addTeacher,
        deleteClass,
        removeStudent,
        removeTeacher,
        setClass,
        type Class,
    } from '@db/teachers/TeacherDatabase.svelte';
    import { CANCEL_SYMBOL, PREVIOUS_SYMBOL } from '@parser/Symbols';
    import { getTeachData } from '../../+layout.svelte';

    let teach = getTeachData();
    let classData = $derived(
        page.params.classid === undefined
            ? undefined
            : teach.getClass(page.params.classid),
    );
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

<Link to="/teach"
    >{PREVIOUS_SYMBOL}
    <LocalizedText path={(l) => l.ui.page.teach.header} /></Link
>
{#if classData === null}
    <Header text={(l) => l.ui.page.class.header} />
    <Notice text={(l) => l.ui.page.class.error.notfound} />
{:else if classData === undefined}
    <Spinning></Spinning>
{:else}
    <Header
        >{#if editable}<TextBox
                id="class-name"
                text={classData.name}
                description={(l) => l.ui.page.class.field.name.description}
                placeholder={(l) => l.ui.page.class.field.name.placeholder}
                dwelled={updateName}
                done={updateName}
            />{:else}{classData.name}{/if}</Header
    >
    <p
        >{#if editable}
            <TextBox
                id="class-description"
                text={classData.description}
                description={(l) =>
                    l.ui.page.class.field.description.description}
                placeholder={(l) =>
                    l.ui.page.class.field.description.placeholder}
                dwelled={updateDescription}
                done={updateDescription}
            />
        {:else}
            {classData.description}
        {/if}</p
    >

    <Subheader text={(l) => l.ui.page.class.subheader.teachers} />

    <!-- Show all the teachers and allow them to be added and removed. -->
    <CreatorList
        uids={classData.teachers}
        add={(uid) =>
            classData.teachers.includes(uid)
                ? undefined
                : addTeacher(classData, uid)}
        remove={(uid) => removeTeacher(classData, uid)}
        removable={() => classData.teachers.length > 1}
        editable={true}
        anonymize={false}
    ></CreatorList>

    <Subheader text={(l) => l.ui.page.class.subheader.students} />

    <CreatorList
        uids={classData.learners}
        add={(uid, username) =>
            classData.learners.includes(uid)
                ? undefined
                : addStudent(classData, uid, username)}
        remove={(uid) => removeStudent(classData, uid)}
        removable={() => classData.learners.length > 1}
        editable={true}
        anonymize={false}
        metadata={new Map(classData.info.map((info) => [info.uid, info.meta]))}
        cell={(uid, column, text) => {
            // Copy the student metadata, but update the column of the corresponding user
            setClass({
                ...classData,
                info: classData.info.map((student) =>
                    student.uid === uid
                        ? {
                              ...student,
                              meta: student.meta.map((value, index) =>
                                  index === column ? text : value,
                              ),
                          }
                        : student,
                ),
            });
        }}
        addcolumn={(index) => {
            setClass({
                ...classData,
                info: classData.info.map((student) => ({
                    ...student,
                    meta: [
                        ...student.meta.slice(0, index),
                        '',
                        ...student.meta.slice(index),
                    ],
                })),
            });
        }}
        removecolumn={(index) => {
            setClass({
                ...classData,
                info: classData.info.map((student) => ({
                    ...student,
                    meta: student.meta.filter((_, i) => i !== index),
                })),
            });
        }}
    ></CreatorList>

    <Subheader text={(l) => l.ui.page.class.subheader.galleries} />

    <MarkupHTMLView markup={(l) => l.ui.page.class.prompt.gallery} />

    <Centered>
        <Button
            tip={(l) => l.ui.page.galleries.button.newgallery}
            action={() => createGallery(classData)}
            large
            icon="+"
        ></Button>
    </Centered>

    {#if newGalleryError}
        <Notice text={(l) => l.ui.page.class.error.gallery} />
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

    <MarkupHTMLView markup={(l) => l.ui.page.class.prompt.delete} />

    <p>
        <ConfirmButton
            background
            tip={(l) => l.ui.page.class.field.delete.tip}
            prompt={(l) => l.ui.page.class.field.delete.label}
            action={async () => {
                if (classData) {
                    await deleteClass(classData);
                    goto('/teach');
                }
            }}
            >{CANCEL_SYMBOL}
            <LocalizedText
                path={(l) => l.ui.page.class.field.delete.label}
            /></ConfirmButton
        >
    </p>
{/if}
