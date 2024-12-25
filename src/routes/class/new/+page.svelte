<script module lang="ts">
    export type NewClassText = {
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
            /** The student data field */
            metadata: FieldText & { note: string };
            /** The password words field */
            words: FieldText & { note: string };
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
            /** Empty metadata */
            empty: string;
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

    export const MAX_CLASS_SIZE = 50;
</script>

<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import { locales } from '@db/Database';
    import Writing from '@components/app/Writing.svelte';
    import TeachersOnly from '../../TeachersOnly.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import Centered from '@components/app/Centered.svelte';
    import type { ButtonText, FieldText } from '@locale/UITexts';
    import LabeledTextbox from '@components/widgets/LabeledTextbox.svelte';
    import {
        createCredentials,
        type StudentWithCredentials,
    } from '../credentials';
    import Subheader from '@components/app/Subheader.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { UsernameLength } from '@db/isValidUsername';
    import { PasswordLength } from '../../login/IsValidPassword';
    import { usernameAccountExists } from '@db/accountExists';
    import { httpsCallable } from 'firebase/functions';
    import { functions } from '@db/firebase';
    import type {
        CreateClassError,
        CreateClassInputs,
        CreateClassOutput,
    } from '@db/function-types';
    import { getUser } from '@components/project/Contexts';
    import Link from '@components/app/Link.svelte';
    import { Creator } from '@db/CreatorDatabase';

    let name = $state('');
    let description = $state('');
    // Some testing data
    // let metadata = $state('name1, 5\nname2, 10\nname3, 15\nname4, 20');
    // let words = $state(
    //     'waffle pickle almond kiwi saffron tofu marshmallow cinnamon licorice anchovy fig basil tapioca clam guava radish quince oat tamarind dill apricot wasabi persimmon millet truffle',
    // );
    let metadata = $state('');
    let words = $state('');
    let editing = $state(false);
    let usernamesTaken = $state<string[]>([]);
    let editedStudents = $state<undefined | StudentWithCredentials[]>(
        undefined,
    );

    let user = getUser();

    const fixed = '9em';

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

    let secrets = $derived(words.split(/\s+/));
    let wordsProblem = $derived(secrets.length < 25);
    let generateProblem = $state(false);

    let students = $derived(trimmed.map((line) => line.split(',')));

    let generatedStudents: StudentWithCredentials[] | undefined =
        $state(undefined);

    let submitting = $state(false);
    let download = $state<boolean>(false);
    let createError = $state<CreateClassError | undefined>(undefined);
    let newClassID = $state<string | undefined>(undefined);

    async function generate() {
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

    let finalStudents = $derived(editedStudents ?? generatedStudents);

    let metadataProblem:
        | 'empty'
        | 'columns'
        | 'duplicates'
        | 'limit'
        | undefined = $derived.by(() => {
        // Must have at least one
        if (trimmed.length === 0) return 'empty';
        // Can't have more than ...
        if (trimmed.length > MAX_CLASS_SIZE) return 'limit';

        // Must have the same number of columns in each line
        if (new Set(trimmed.map((line) => line.split(',').length)).size !== 1)
            return 'columns';
        // No duplicates
        if (new Set(trimmed).size !== trimmed.length) return 'duplicates';

        // No problems.
        return undefined;
    });

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

            // Create a CSV for download.
            const csv =
                `${finalStudents[0].meta.map(() => 'info').join(',')},username,password\n` +
                finalStudents
                    .map(
                        (s) =>
                            `${s.meta.join(',')},${s.username},${s.password}`,
                    )
                    .join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-16' });
            const url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'students.csv');
            document.body.appendChild(link);
            link.click(); // This triggers the download.
            document.body.removeChild(link);

            // Tell the UI that the download info is ready to show.
            download = true;
        }
    }
</script>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.newclass.header)}</Header>
    <TeachersOnly>
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.newclass.prompt.start)}
        />

        <form>
            <Subheader
                >{$locales.get(
                    (l) => l.ui.page.newclass.subheader.class,
                )}</Subheader
            >
            <LabeledTextbox
                {fixed}
                texts={(l) => l.ui.page.newclass.field.name}
                editable={!download}
                bind:text={name}
            ></LabeledTextbox>
            <LabeledTextbox
                box
                {fixed}
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
                    (l) => l.ui.page.newclass.field.metadata.note,
                )}
            ></MarkupHtmlView>

            <LabeledTextbox
                box
                {fixed}
                editable={!editing}
                texts={(l) => l.ui.page.newclass.field.metadata}
                bind:text={metadata}
            ></LabeledTextbox>

            {#if metadataProblem !== undefined}
                <Feedback>
                    {$locales.get(
                        (l) => l.ui.page.newclass.error[metadataProblem],
                    )}
                </Feedback>
            {/if}

            <MarkupHtmlView
                markup={$locales.get(
                    (l) => l.ui.page.newclass.field.words.note,
                )}
            ></MarkupHtmlView>
            <LabeledTextbox
                box
                {fixed}
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
                        action={generate}
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
                    tip={$locales.get(
                        (l) => l.ui.page.newclass.field.submit.tip,
                    )}
                    action={submit}
                    active={!download &&
                        !submitting &&
                        $user !== null &&
                        name.length > 0 &&
                        description.length > 0 &&
                        finalStudents !== undefined &&
                        finalStudents.length > 0 &&
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
                <MarkupHtmlView
                    markup={$locales.get(
                        (l) => l.ui.page.newclass.prompt.download,
                    )}
                />
                <Centered>
                    <Link to="/class/{newClassID}">{name}</Link>
                </Centered>
            {/if}
        </form>
    </TeachersOnly>
</Writing>

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-block-start: 1em;
    }

    table {
        width: 100%;
    }
</style>
