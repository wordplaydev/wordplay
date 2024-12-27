<script module lang="ts">
    import type { ButtonText, FieldText } from '@locale/UITexts';

    /** The localization strings for the page. */
    export type NewClassPageText = {
        /** The header for the create class page */
        header: string;
        subheader: {
            /** The subheader for the create class page */
            class: string;
            /** The subheader for the create class page */
            students: string;
            /** The subheader for the preview */
            credentials: string;
            /** The subheader for submitting*/
            submit: string;
        };
        prompt: {
            /** Explain the purpose of the form */
            start: string;
            /** Prompt review of the genrated students.*/
            review: string;
            /** What to say before there are any generated credentials. */
            ready: string;
            /** When generating usernames and passwords */
            pending: string;
            /** Whether to edit the generated accounts */
            edit: string;
            /** Ready to submit instructions */
            submit: string;
            /** Submitting instructions */
            submitting: string;
            /** Download instructions */
            download: string;
        };
        field: {
            /** The class name */
            name: FieldText;
            /** The class description */
            description: FieldText;
            existing: {
                /** Explanation of existing users. */
                prompt: string;
                /** Label for existing users. */
                label: string;
            };
            /** The student data field */
            metadata: FieldText & { prompt: string };
            /** The password words field */
            words: FieldText & { prompt: string };
            /** The generate credentials button */
            generate: ButtonText;
            /** The submit button */
            submit: ButtonText;
            /** The edit button */
            edit: ButtonText;
            /** The done editing button */
            done: ButtonText;
        };
        error: {
            /** Inconsistent columns */
            columns: string;
            /** Duplicate columns */
            duplicates: string;
            /** A problem generating usernames */
            generate: string;
            /** A user name is taken */
            taken: string;
            /** Too many users */
            limit: string;
            /** Not enough words */
            words: string;
            /** Couldn't create one or more accounts */
            account: string;
            /** Generic error for developers to inspect */
            generic: string;
        };
    };

    /** The maximum number of students in a class. */
    export const MaxClassSize = 50;
    /** The fixed width of the fields. */
    const FieldLabelWidth = '9em';
</script>

<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import { locales } from '@db/Database';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import Centered from '@components/app/Centered.svelte';
    import LabeledTextbox from '@components/widgets/LabeledTextbox.svelte';
    import {
        createCredentials,
        type StudentWithCredentials,
    } from '../credentials';
    import Subheader from '@components/app/Subheader.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { UsernameLength } from '@db/creators/isValidUsername';
    import { PasswordLength } from '../../../login/IsValidPassword';
    import { usernameAccountExists } from '@db/creators/accountExists';
    import { httpsCallable } from 'firebase/functions';
    import { functions } from '@db/firebase';
    import type {
        CreateClassError,
        CreateClassInputs,
        CreateClassOutput,
    } from '@db/functions';
    import { getUser } from '@components/project/Contexts';
    import Link from '@components/app/Link.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import { PREVIOUS_SYMBOL } from '@parser/Symbols';
    import { goto } from '$app/navigation';
    import TeachersOnly from '../../TeachersOnly.svelte';

    /** The state to store the name of the class. */
    let name = $state('');

    /** The state to store the description fo the class. */
    let description = $state('');
    /** The CSV text of the student metadata */
    let metadata = $state('');
    /** The space separated list of words for generating passwords */
    let words = $state('');
    /** Whether the generated usernames and passwords are being edited */
    let editing = $state(false);
    /** The cache of usernames that are taken from our checks. */
    let usernamesTaken = $state<string[]>([]);
    /** The edited student data, if the teacher chose to edit. */
    let editedStudents = $state<undefined | StudentWithCredentials[]>(
        undefined,
    );
    /** Whether there is a problem with the generated usernames and passwords */
    let generateProblem = $state(false);
    /** Whether the form has been submitted */
    let submitting = $state(false);
    /** Whether the results have been returned and we're downloading them */
    let download = $state<boolean>(false);
    /** The error upon account creation */
    let createError = $state<CreateClassError | undefined>(undefined);
    /** The class ID created upon successful submission of the form */
    let newClassID = $state<string | undefined>(undefined);

    /** The teacher logged in */
    let user = getUser();

    // Trim all the cells for normalization and comparison.
    let trimmed = $derived(
        metadata
            .split('\n')
            .filter((l) => l.trim() !== '')
            .map((line) =>
                line
                    .split(',')
                    .map((s) => s.trim())
                    .join(','),
            ),
    );

    /** The secret words, converted into a list */
    let secrets = $derived(words.split(/\s+/));
    /** The 2D array of student metadata, derived from the trimmed student data */
    let students = $derived(trimmed.map((line) => line.split(',')));
    /** Whether there is a probelm with the secret words */
    let wordsProblem = $derived(students.length > 0 && secrets.length < 25);

    /** The existing students */
    let existingStudents = $state<string[]>([]);

    /** The generated student data */
    let generatedStudents: StudentWithCredentials[] | undefined =
        $state(undefined);

    /** A function to generate usernames and passwords using the form data*/
    async function generateCredentials() {
        const credentials = await createCredentials(students, secrets);
        if (credentials === undefined) {
            generateProblem = true;
            return;
        }

        generatedStudents = students.map((student, index) => {
            return {
                username: credentials[index]?.username ?? '',
                password: credentials[index]?.password ?? '',
                meta: student,
            };
        });
    }

    /** The final list of student data to use for submission; either the edited data, or the generated data. */
    let finalStudents = $derived(editedStudents ?? generatedStudents ?? []);

    /** Whether there is a problem with the metadata, for displaying feedback */
    let metadataProblem: 'columns' | 'duplicates' | 'limit' | undefined =
        $derived.by(() => {
            if (students.length === 0) return undefined;

            // Can't have more than ...
            if (students.length > MaxClassSize) return 'limit';

            // Must have the same number of columns in each line
            if (
                new Set(trimmed.map((line) => line.split(',').length)).size !==
                1
            )
                return 'columns';
            // No duplicates
            if (new Set(trimmed).size !== trimmed.length) return 'duplicates';

            // No problems.
            return undefined;
        });

    /** Submit the final student data, creating the accounts and class document. */
    async function submit() {
        if (functions === undefined) return;
        if ($user === null) return;
        if (!finalStudents) return;

        // Give some feedback about the async call.
        submitting = true;

        // Call the cloud function, which creates the accounts and the class document
        // and gives us the new class and student uids back.
        const createClass = httpsCallable<CreateClassInputs, CreateClassOutput>(
            functions,
            'createClass',
        );
        const { classid, error } = (
            await createClass({
                teacher: $user.uid,
                name,
                description,
                existing: existingStudents,
                students: finalStudents.map((s) => {
                    // Convert the username to an email
                    return {
                        ...s,
                        username: Creator.usernameEmail(s.username),
                    };
                }),
            })
        ).data;

        submitting = false;

        if (error) {
            createError = error;
        } else if (classid) {
            newClassID = classid;

            if (students.length > 0) {
                // If there were accounts generated, create a CSV for download.
                const csv =
                    `${finalStudents[0].meta.map(() => 'info').join(',')},username,password\n` +
                    finalStudents
                        .map(
                            (s) =>
                                `${s.meta.join(',')},${s.username},${s.password}`,
                        )
                        .join('\n');
                const blob = new Blob([csv], {
                    type: 'text/csv;charset=utf-16',
                });
                const url = URL.createObjectURL(blob);
                var link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', 'students.csv');
                document.body.appendChild(link);
                link.click(); // This triggers the download.
                document.body.removeChild(link);
                // Tell the UI that the download info is ready to show.
                download = true;
            } else goto(`/teach/class/${classid}`);
        }
    }
</script>

<TeachersOnly>
    <Link to="/teach"
        >{PREVIOUS_SYMBOL} {$locales.get((l) => l.ui.page.teach.header)}</Link
    >
    <Header>{$locales.get((l) => l.ui.page.newclass.header)}</Header>
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.newclass.prompt.start)}
    />

    <div class="page">
        <Subheader
            >{$locales.get(
                (l) => l.ui.page.newclass.subheader.class,
            )}</Subheader
        >
        <LabeledTextbox
            fixed={FieldLabelWidth}
            texts={(l) => l.ui.page.newclass.field.name}
            editable={!download}
            bind:text={name}
        ></LabeledTextbox>
        <LabeledTextbox
            box
            fixed={FieldLabelWidth}
            texts={(l) => l.ui.page.newclass.field.description}
            editable={!download}
            bind:text={description}
        ></LabeledTextbox>

        <Subheader
            >{$locales.get(
                (l) => l.ui.page.newclass.subheader.students,
            )}</Subheader
        >

        <MarkupHtmlView
            markup={$locales.get(
                (l) => l.ui.page.newclass.field.existing.prompt,
            )}
        ></MarkupHtmlView>

        <Labeled
            fixed={FieldLabelWidth}
            column
            label={$locales.get((l) => l.ui.page.newclass.field.existing.label)}
        >
            <CreatorList
                uids={existingStudents}
                add={(uid) => existingStudents.push(uid)}
                remove={(uid) =>
                    (existingStudents = existingStudents.filter(
                        (u) => u !== uid,
                    ))}
                removable={() => true}
                editable={true}
                anonymize={false}
            ></CreatorList>
        </Labeled>

        <MarkupHtmlView
            markup={$locales.get(
                (l) => l.ui.page.newclass.field.metadata.prompt,
            )}
        ></MarkupHtmlView>

        <LabeledTextbox
            box
            fixed={FieldLabelWidth}
            editable={!editing}
            texts={(l) => l.ui.page.newclass.field.metadata}
            bind:text={metadata}
        ></LabeledTextbox>

        {#if metadataProblem !== undefined}
            <Feedback>
                {$locales.get((l) => l.ui.page.newclass.error[metadataProblem])}
            </Feedback>
        {/if}

        <!-- Only need secret words if there are students to add -->
        {#if students.length > 0}
            <MarkupHtmlView
                markup={$locales.get(
                    (l) => l.ui.page.newclass.field.words.prompt,
                )}
            ></MarkupHtmlView>
            <LabeledTextbox
                box
                fixed={FieldLabelWidth}
                texts={(l) => l.ui.page.newclass.field.words}
                editable={!editing}
                bind:text={words}
            ></LabeledTextbox>

            {#if wordsProblem}
                <Feedback>
                    {$locales.get((l) => l.ui.page.newclass.error.words)}
                </Feedback>
            {/if}

            <Subheader
                >{$locales.get(
                    (l) => l.ui.page.newclass.subheader.credentials,
                )}</Subheader
            >
            {#if generatedStudents === undefined}
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.page.newclass.prompt.ready,
                    )}
                />

                <Centered>
                    <Button
                        background
                        tip={$locales.get(
                            (l) => l.ui.page.newclass.field.generate.tip,
                        )}
                        action={generateCredentials}
                        active={metadataProblem === undefined && !wordsProblem}
                    >
                        {$locales.get(
                            (l) => l.ui.page.newclass.field.generate.label,
                        )}</Button
                    >
                </Centered>

                {#if generateProblem}
                    <Feedback>
                        {$locales.get((l) => l.ui.page.newclass.error.generate)}
                    </Feedback>
                {/if}
            {:else}
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.page.newclass.prompt.review,
                    )}
                />

                <Centered>
                    <Button
                        background
                        tip={$locales.get(
                            (l) => l.ui.page.newclass.field.edit.tip,
                        )}
                        action={() => {
                            if (generatedStudents === undefined) return;
                            editing = true;
                            editedStudents = generatedStudents.map((s) => {
                                return { ...s };
                            });
                        }}
                        active={generatedStudents !== undefined &&
                            generatedStudents.length > 0 &&
                            !editing}
                    >
                        {$locales.get(
                            (l) => l.ui.page.newclass.field.edit.label,
                        )}</Button
                    >
                </Centered>

                {@const taken = finalStudents
                    ?.filter((s) => usernamesTaken.includes(s.username))
                    .map((s) => s.username)}
                {#if taken !== undefined && taken.length > 0}
                    <Feedback
                        >{$locales.get((l) => l.ui.page.newclass.error.taken)}:
                        <em>{taken.join(', ')}</em></Feedback
                    >
                {/if}

                {#if generatedStudents !== undefined && finalStudents !== undefined}
                    <table>
                        <thead>
                            <tr>
                                {#each students[0]}
                                    <td></td>
                                {/each}
                                <th
                                    >{$locales.get(
                                        (l) =>
                                            l.ui.page.login.field.username
                                                .placeholder,
                                    )}</th
                                >
                                <th
                                    >{$locales.get(
                                        (l) =>
                                            l.ui.page.login.field.password
                                                .placeholder,
                                    )}</th
                                >
                            </tr>
                        </thead>
                        <tbody>
                            {#each generatedStudents as student, studentIndex}
                                {@const columns = student.meta.length}
                                <tr>
                                    {#each student.meta as cell, columnIndex}
                                        <td
                                            >{#if editing}
                                                <TextField
                                                    description=""
                                                    placeholder=""
                                                    text={editedStudents !==
                                                    undefined
                                                        ? editedStudents[
                                                              studentIndex
                                                          ].meta[columnIndex]
                                                        : cell}
                                                    editable={!submitting &&
                                                        !download}
                                                    changed={(text) =>
                                                        editedStudents
                                                            ? (editedStudents[
                                                                  studentIndex
                                                              ].meta[
                                                                  columnIndex
                                                              ] = text)
                                                            : undefined}
                                                ></TextField>
                                            {:else}{cell}
                                            {/if}</td
                                        >
                                    {/each}
                                    <td
                                        >{#if editing}
                                            <TextField
                                                description=""
                                                placeholder=""
                                                text={finalStudents[
                                                    studentIndex
                                                ].username}
                                                validator={(text) =>
                                                    !usernamesTaken.includes(
                                                        text,
                                                    )}
                                                changed={(text) => {
                                                    // Update the username after it's changed.
                                                    editedStudents
                                                        ? (editedStudents[
                                                              studentIndex
                                                          ].username = text)
                                                        : undefined;
                                                }}
                                                editable={!submitting &&
                                                    !download}
                                                dwelled={async (username) => {
                                                    // After done editing, check if the username is taken.
                                                    if (
                                                        await usernameAccountExists(
                                                            username,
                                                        )
                                                    )
                                                        usernamesTaken.push(
                                                            username,
                                                        );
                                                }}
                                            ></TextField>
                                        {:else}{finalStudents[studentIndex]
                                                .username}
                                        {/if}</td
                                    >
                                    <td
                                        >{#if editing}
                                            <TextField
                                                description=""
                                                placeholder=""
                                                text={finalStudents[
                                                    studentIndex
                                                ].password}
                                                editable={!submitting &&
                                                    !download}
                                                changed={(text) =>
                                                    editedStudents
                                                        ? (editedStudents[
                                                              studentIndex
                                                          ].password = text)
                                                        : undefined}
                                            ></TextField>
                                        {:else}{finalStudents[studentIndex]
                                                .password}
                                        {/if}</td
                                    >
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            {/if}
        {/if}

        <Subheader
            >{$locales.get(
                (l) => l.ui.page.newclass.subheader.submit,
            )}</Subheader
        >

        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.newclass.prompt.submit)}
        />

        <Centered>
            <Button
                background
                tip={$locales.get((l) => l.ui.page.newclass.field.submit.tip)}
                action={submit}
                active={!download &&
                    !submitting &&
                    $user !== null &&
                    name.length > 0 &&
                    (students.length === 0 ||
                        generatedStudents !== undefined) &&
                    finalStudents.every(
                        (s) =>
                            s.username.length >= UsernameLength &&
                            !usernamesTaken.includes(s.username) &&
                            s.password.length >= PasswordLength,
                    )}
            >
                {$locales.get(
                    (l) => l.ui.page.newclass.field.submit.label,
                )}</Button
            >
        </Centered>

        {#if createError}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.newclass.error[createError!.kind],
                )}: {createError.info}</Feedback
            >
        {/if}
        {#if download === true}
            {#if finalStudents.length > 0}
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.page.newclass.prompt.download,
                    )}
                />
            {/if}
            <Centered>
                <Link to="/teach/class/{newClassID}">{name}</Link>
            </Centered>
        {/if}
    </div>
</TeachersOnly>

<style>
    .page {
        display: flex;
        flex-direction: column;
        gap: 1em;
        margin-block-start: 1em;
    }

    table {
        width: 100%;
    }
</style>
