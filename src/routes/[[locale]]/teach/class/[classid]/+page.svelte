<script lang="ts">
    import { page } from '$app/state';
    import Centered from '#components/app/Centered.svelte';
    import GalleryPreview from '#components/app/GalleryPreview.svelte';
    import PageHeader from '#components/app/PageHeader.svelte';
    import Notice from '#components/app/Notice.svelte';
    import PreviewPlaceholder from '#components/app/PreviewPlaceholder.svelte';
    import Spinning from '#components/app/Spinning.svelte';
    import Subheader from '#components/app/Subheader.svelte';
    import MarkupHTMLView from '#components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '#components/project/Contexts.ts';
    import CreatorList from '#components/project/CreatorList.svelte';
    import Button from '#components/widgets/Button.svelte';
    import ConfirmButton from '#components/widgets/ConfirmButton.svelte';
    import LocalizedText from '#components/widgets/LocalizedText.svelte';
    import TextBox from '#components/widgets/TextBox.svelte';
    import Title from '#components/widgets/Title.svelte';
    import { disconnected, Galleries, locales } from '#db/Database.ts';
    import {
        addStudent,
        addTeacher,
        deleteClass,
        removeStudent,
        removeTeacher,
        updateClass,
        type Class,
    } from '#db/teachers/TeacherDatabase.svelte.ts';
    import { CANCEL_SYMBOL } from '#parser/Symbols.ts';
    import { getTeachData } from '#db/teachers/TeachData.svelte.ts';
    import { localeGoto } from '#util/localeGoto.ts';
    import Nested from '#components/app/Nested.svelte';
    import AddCreator from '#components/project/AddCreator.svelte';
    import NewStudent from './NewStudent.svelte';

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
            localeGoto(`/gallery/${newGalleryID}`);
        } catch (error) {
            console.error(error);
            newGalleryError = true;
        }
    }

    // Class writes raise the top banner on failure from the TeacherDatabase
    // layer, so these handlers don't need their own error UI.
    function updateName(name: string) {
        if (classData) updateClass(classData.id, { name });
    }

    function updateDescription(description: string) {
        if (classData) updateClass(classData.id, { description });
    }
</script>

{#if classData === null}
    <Title text={(l) => l.ui.page.class.header} />
    <PageHeader header={(l) => l.ui.page.class.header} />
    <Notice text={(l) => l.ui.page.class.error.notfound} />
{:else if classData === undefined}
    <Spinning></Spinning>
{:else}
    <PageHeader name={classData.name}>
        {#snippet title()}{#if editable}<TextBox
                    id="class-name"
                    text={classData.name}
                    description={(l) => l.ui.page.class.field.name.description}
                    placeholder={(l) => l.ui.page.class.field.name.placeholder}
                    dwelled={updateName}
                    done={updateName}
                />{:else}{classData.name}{/if}{/snippet}
    </PageHeader>
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
        id="teacher-to-add"
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
        remove={(uid) => removeStudent(classData, uid)}
        removable={() => classData.learners.length > 1}
        editable={true}
        anonymize={false}
        metadata={new Map(classData.info.map((info) => [info.uid, info.meta]))}
        cell={(uid, column, text) => {
            // Copy the student metadata, but update the column of the corresponding user
            updateClass(classData.id, {
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
            updateClass(classData.id, {
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
            updateClass(classData.id, {
                info: classData.info.map((student) => ({
                    ...student,
                    meta: student.meta.filter((_, i) => i !== index),
                })),
            });
        }}
    ></CreatorList>

    <!-- Two ways to add a student, side by side so each is explained. Creating
         one is offered only in a password class: an email-class student can
         make their own account, which the first then adds. -->
    {#if editable}
        <div class="adding">
            <Nested>
                <section class="stack">
                    <Subheader
                        spaced
                        text={(l) => l.ui.page.class.subheader.existing}
                    />
                    <MarkupHTMLView
                        markup={(l) => l.ui.page.class.prompt.existing}
                    />
                    <AddCreator
                        id="student-to-add"
                        add={(uid, username) =>
                            classData.learners.includes(uid)
                                ? undefined
                                : addStudent(classData, uid, username)}
                    />
                </section>
                {#if classData.affirmation === undefined}
                    <section class="stack">
                        <Subheader
                            spaced
                            text={(l) => l.ui.page.class.subheader.new}
                        />
                        <NewStudent classy={classData} />
                    </section>
                {/if}
            </Nested>
        </div>
    {/if}

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

    <div class="previews">
        {#each classData.galleries as gallery}
            {#await Galleries.get(gallery)}
                <PreviewPlaceholder />
            {:then gallery}
                {#if gallery}
                    <GalleryPreview {gallery} />
                {/if}
            {/await}
        {/each}
    </div>

    <MarkupHTMLView markup={(l) => l.ui.page.class.prompt.delete} />

    <p>
        <ConfirmButton
            background
            enabled={!$disconnected}
            tip={(l) => l.ui.page.class.field.delete.tip}
            prompt={(l) => l.ui.page.class.field.delete.label}
            action={async () => {
                if (classData) {
                    // deleteClass raises the top banner on failure; only
                    // navigate away once it actually succeeded.
                    if (await deleteClass(classData)) localeGoto('/teach');
                }
            }}
            >{CANCEL_SYMBOL}
            <LocalizedText
                path={(l) => l.ui.page.class.field.delete.label}
            /></ConfirmButton
        >
    </p>
{/if}

<style>
    /* Apart from the table above, so adding reads as its own step; two columns
       when there is room, one when there isn't. */
    .adding {
        margin-block-start: var(--wordplay-spacing-double);
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 22em), 1fr));
        gap: var(--wordplay-spacing-double);
        align-items: start;
    }
    /* A grid so that when the page is wide enough for multiple columns,
       previews share a consistent inline-start across rows. */
    .previews {
        width: 100%;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 28em), 1fr));
        column-gap: var(--wordplay-spacing-quad);
        row-gap: var(--wordplay-spacing-double);
        align-items: start;
    }
</style>
