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
            /** Whether to edit the generated accounts */
            edit: string;
            /** Ready to submit instructions */
            submit: string;
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
            /** The submit button */
            submit: ButtonText;
            /** The edit button */
            edit: ButtonText;
        };
        error: {
            /** Empty metadata */
            empty: string;
            /** Inconsistent columns */
            columns: string;
            /** Duplicate columns */
            duplicates: string;
            /** Too many users */
            limit: string;
            /** Not enough words */
            words: string;
        };
    };
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
        type Credentials,
        type StudentWithCredentials,
    } from '../credentials';
    import Subheader from '@components/app/Subheader.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { UsernameLength } from '@db/isValidUsername';
    import { PasswordLength } from '../../login/IsValidPassword';

    let name = $state('');
    let description = $state('');
    let metadata = $state('');
    let words = $state('');
    let editing = $state(false);
    let editedStudents = $state<undefined | StudentWithCredentials[]>(
        undefined,
    );

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

    let students = $derived(trimmed.map((line) => line.split(',')));

    let generatedStudents: StudentWithCredentials[] = $derived.by(() => {
        const credentials = createCredentials(students, secrets);

        return students.map((student, index) => {
            return {
                username: credentials[index]?.username ?? '',
                password: credentials[index]?.password ?? '',
                meta: student,
            };
        });
    });

    let finalStudents = $derived(editedStudents ?? generatedStudents);

    let metadataProblem:
        | 'empty'
        | 'columns'
        | 'duplicates'
        | 'limit'
        | undefined = $derived.by(() => {
        // Must have at least one
        if (trimmed.length === 0) return 'empty';
        // Can't have more than 35.
        if (trimmed.length > 35) return 'limit';

        // Must have the same number of columns in each line
        if (new Set(trimmed.map((line) => line.split(',').length)).size !== 1)
            return 'columns';
        // No duplicates
        if (new Set(trimmed).size !== trimmed.length) return 'duplicates';

        // No problems.
        return undefined;
    });

    function submit() {}
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
                bind:text={name}
            ></LabeledTextbox>
            <LabeledTextbox
                box
                {fixed}
                texts={(l) => l.ui.page.newclass.field.description}
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

            {#if wordsProblem !== undefined}
                <Feedback>
                    {$locales.get((l) => l.ui.page.newclass.error.words)}
                </Feedback>
            {/if}

            <Subheader
                >{$locales.get(
                    (l) => l.ui.page.newclass.subheader.credentials,
                )}</Subheader
            >
            {#if students.length > 0}
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
                            editing = true;
                            editedStudents = generatedStudents.map((s) => {
                                return { ...s };
                            });
                        }}
                        active={generatedStudents.length > 0 && !editing}
                    >
                        {$locales.get(
                            (l) => l.ui.page.newclass.field.edit.label,
                        )}</Button
                    >
                </Centered>

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
                                                changed={(text) =>
                                                    editedStudents
                                                        ? (editedStudents[
                                                              studentIndex
                                                          ].meta[columnIndex] =
                                                              text)
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
                                            text={finalStudents[studentIndex]
                                                .username}
                                            changed={(text) =>
                                                editedStudents
                                                    ? (editedStudents[
                                                          studentIndex
                                                      ].username = text)
                                                    : undefined}
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
                                            text={finalStudents[studentIndex]
                                                .password}
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
            {:else}
                —
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
                    active={name.length > 0 &&
                        description.length > 0 &&
                        finalStudents.length > 0 &&
                        finalStudents.every(
                            (s) =>
                                s.username.length >= UsernameLength &&
                                s.password.length >= PasswordLength,
                        )}
                >
                    {$locales.get(
                        (l) => l.ui.page.newclass.field.submit.label,
                    )}</Button
                >
            </Centered>
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
