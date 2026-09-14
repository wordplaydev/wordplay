<script module lang="ts">
    /** The maximum number of students in a class. */
    export const MaxClassSize = 50;
    /** The fixed width of the fields. */
    const FieldLabelWidth = '9em';
</script>

<script lang="ts">
    import Centered from '@components/app/Centered.svelte';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import LabeledTextbox from '@components/widgets/LabeledTextbox.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Title from '@components/widgets/Title.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { usernameAvailable } from '@db/creators/usernames';
    import { UsernameLength } from '@db/creators/username';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import { getFunctionsInstance } from '@db/firebase';
    import { httpsCallable } from 'firebase/functions';
    import type {
        ClassSigninMethod,
        CreateClassError,
        CreateClassInputs,
        CreateClassOutput,
    } from 'shared-types';
    import { PasswordLength } from '../../../login/IsValidPassword';
    import TeachersOnly from '../../TeachersOnly.svelte';
    import {
        createCredentials,
        type StudentWithCredentials,
    } from '../credentials';
    import { everyRowHasAnAddress } from '../roster';
    import { localeGoto } from '@util/localeGoto';

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
    /** How this class's students will sign in. Undefined until the teacher
     *  says, and nothing below the question is shown until they do: a
     *  preselected default would decide for them, which is the same thing that
     *  was wrong with inferring it from the roster. */
    let method = $state<ClassSigninMethod | undefined>(undefined);
    /** Whether the teacher has affirmed they may bind their students' email
     *  addresses to accounts. Only asked for, and only required, in an email
     *  class. */
    let affirmed = $state(false);
    /** Names this submission, so a retry after a dropped response is answered
     *  with the class the first attempt made rather than failing on the
     *  usernames it took. Minted on first submit rather than at mount, so it
     *  never runs during server rendering, and kept across retries of the same
     *  roster. */
    let creationKey: string | undefined = undefined;
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
    /** Whether there is a probelm with the secret words. An email class never
     *  needs any. */
    let wordsProblem = $derived(method === 'password' && secrets.length < 25);

    /** The existing students */
    let existingStudents = $state<string[]>([]);

    /** The generated student data */
    let generatedStudents: StudentWithCredentials[] | undefined =
        $state(undefined);

    /** A function to generate usernames and passwords using the form data*/
    async function generateCredentials() {
        if (method === undefined) return;
        const credentials = await createCredentials(students, secrets, method);
        if (credentials === undefined) {
            generateProblem = true;
            return;
        }

        generatedStudents = students.map((student, index) => {
            return {
                username: credentials[index]?.username ?? '',
                password: credentials[index]?.password ?? '',
                email: credentials[index]?.email,
                meta: student,
            };
        });
    }

    /** The final list of student data to use for submission; either the edited data, or the generated data. */
    let finalStudents = $derived(editedStudents ?? generatedStudents ?? []);

    /** Whether there is a problem with the metadata, for displaying feedback */
    let metadataProblem:
        'columns' | 'duplicates' | 'limit' | 'addresses' | undefined =
        $derived.by(() => {
            if (students.length === 0) return undefined;

            // Can't have more than ...
            if (students.length > MaxClassSize) return 'limit';

            // In an email class the first column is what students sign in
            // with, so a line that doesn't start with an address is said
            // plainly rather than quietly becoming something else.
            if (method === 'email' && !everyRowHasAnAddress(students))
                return 'addresses';

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
        const functions = await getFunctionsInstance();
        if (functions === undefined) return;
        if (!isAuthenticated($user)) return;
        if (!finalStudents) return;
        // The button is gated on this too; the wire has no shape for a class
        // whose students have not been told how to sign in.
        if (method === undefined) return;

        // Give some feedback about the async call.
        submitting = true;

        // Call the cloud function, which creates the accounts and the class document
        // and gives us the new class and student uids back.
        const createClass = httpsCallable<CreateClassInputs, CreateClassOutput>(
            functions,
            'createClass',
        );
        // Stable across retries of the same roster: the server answers a second
        // call with the same key by handing back the class the first one made,
        // rather than failing on the usernames it took.
        creationKey ??= crypto.randomUUID();

        const {
            classid,
            error,
            students: placed,
        } = (
            await createClass({
                teacher: $user.uid,
                name,
                description,
                existing: existingStudents,
                students: finalStudents.map((s) => ({
                    username: s.username,
                    meta: s.meta,
                    // An address or a password, never both: which of the two a
                    // student has is what tells the server how they sign in.
                    ...(s.email === undefined
                        ? { password: s.password }
                        : { email: s.email }),
                })),
                method,
                affirmed,
                key: creationKey,
            })
        ).data;

        submitting = false;

        if (error) {
            createError = error;
        } else if (classid) {
            newClassID = classid;

            if (students.length > 0) {
                // If there were accounts generated, create a CSV for download.
                // Names come from the server's answer, not the form's proposal:
                // an address that already had an account keeps the username
                // that account already has.
                // No password column in an email class: there is no password,
                // and an empty column invites the teacher to look for one.
                const passwords = method === 'password';
                // One "info" column per metadata column, taken from the first
                // row; with no rows there is nothing to describe.
                const first = finalStudents[0];
                const info =
                    first === undefined ? [] : first.meta.map(() => 'info');
                const csv =
                    `${info.join(',')},username${passwords ? ',password' : ''}\n` +
                    finalStudents
                        .map(
                            (s, index) =>
                                `${s.meta.join(',')},${placed?.[index]?.username ?? s.username}${passwords ? `,${s.password}` : ''}`,
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
            } else localeGoto(`/teach/class/${classid}`);
        }
    }
</script>

<TeachersOnly>
    <Title text={(l) => l.ui.page.newclass.header} />
    <Header text={(l) => l.ui.page.newclass.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.newclass.prompt.start} />

    <div class="page">
        <Subheader text={(l) => l.ui.page.newclass.subheader.class} />
        <LabeledTextbox
            id="class-name"
            fixed={FieldLabelWidth}
            description={(l) => l.ui.page.newclass.field.name.description}
            placeholder={(l) => l.ui.page.newclass.field.name.placeholder}
            editable={!download}
            bind:text={name}
        ></LabeledTextbox>
        <LabeledTextbox
            id="class-description"
            box
            fixed={FieldLabelWidth}
            description={(l) =>
                l.ui.page.newclass.field.description.description}
            placeholder={(l) =>
                l.ui.page.newclass.field.description.placeholder}
            editable={!download}
            bind:text={description}
        ></LabeledTextbox>

        <Subheader text={(l) => l.ui.page.newclass.subheader.students} />
        <MarkupHTMLView markup={(l) => l.ui.page.newclass.field.existing.prompt}
        ></MarkupHTMLView>

        <Labeled
            fixed={FieldLabelWidth}
            column
            label={(l) => l.ui.page.newclass.field.existing.label}
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

        <!-- The question the rest of the form follows from. Nothing below it
             appears until it is answered: a class is one kind of student
             throughout, and a preselected default would decide that for the
             teacher rather than asking. -->
        <MarkupHTMLView markup={(l) => l.ui.page.newclass.field.signin.prompt}
        ></MarkupHTMLView>

        <Mode
            modes={(l) => l.ui.page.newclass.field.signin.mode}
            choice={method === undefined
                ? undefined
                : method === 'email'
                  ? 1
                  : 0}
            select={(choice) => (method = choice === 1 ? 'email' : 'password')}
            active={!download && !submitting && !editing}
        ></Mode>

        <!-- Binding a real address to an account is what the age of consent
             governs, so the teacher has to say they may before the form will
             submit. It sits with the choice rather than further down, because
             choosing email is the moment the assertion is made. -->
        {#if method === 'email'}
            <MarkupHTMLView
                markup={(l) => l.ui.page.newclass.field.affirm.prompt}
            ></MarkupHTMLView>
            <!-- The label is a sibling rather than the widget's own: Checkbox
                 renders its label as a tooltip and an aria-label only, so on
                 its own it is a naked box under a paragraph. Same pairing the
                 moderation decisions use. -->
            <div class="affirm">
                <Checkbox
                    id="email-affirmation"
                    label={(l) => l.ui.page.newclass.field.affirm.label}
                    bind:on={affirmed}
                    editable={!download && !submitting}
                ></Checkbox>
                <label for="email-affirmation"
                    ><LocalizedText
                        path={(l) => l.ui.page.newclass.field.affirm.label}
                    /></label
                >
            </div>
        {/if}

        <!-- The roster, once we know what its first column means. -->
        {#if method !== undefined}
            {@const roster = method === 'email' ? 'addresses' : 'metadata'}
            <MarkupHTMLView
                markup={(l) => l.ui.page.newclass.field[roster].prompt}
            ></MarkupHTMLView>

            <LabeledTextbox
                id="metadata"
                box
                fixed={FieldLabelWidth}
                editable={!editing}
                description={(l) =>
                    l.ui.page.newclass.field[roster].description}
                placeholder={(l) =>
                    l.ui.page.newclass.field[roster].placeholder}
                bind:text={metadata}
            ></LabeledTextbox>

            {#if metadataProblem !== undefined}
                <Notice
                    text={(l) => l.ui.page.newclass.error[metadataProblem]}
                />
            {/if}
        {/if}

        <!-- Only a password class needs words to build passwords out of. -->
        {#if method === 'password'}
            <MarkupHTMLView
                markup={(l) => l.ui.page.newclass.field.words.prompt}
            ></MarkupHTMLView>
            <LabeledTextbox
                id="secret-words"
                box
                fixed={FieldLabelWidth}
                description={(l) => l.ui.page.newclass.field.words.description}
                placeholder={(l) => l.ui.page.newclass.field.words.placeholder}
                editable={!editing}
                bind:text={words}
            ></LabeledTextbox>

            {#if wordsProblem}
                <Notice text={(l) => l.ui.page.newclass.error.words} />
            {/if}
        {/if}

        {#if method !== undefined && students.length > 0}
            <Subheader
                text={(l) =>
                    method === 'email'
                        ? l.ui.page.newclass.subheader.usernames
                        : l.ui.page.newclass.subheader.credentials}
            />
            {#if generatedStudents === undefined}
                <MarkupHTMLView
                    markup={(l) => l.ui.page.newclass.prompt.ready}
                />

                <Centered>
                    <Button
                        background
                        tip={(l) => l.ui.page.newclass.field.generate.tip}
                        action={generateCredentials}
                        active={metadataProblem === undefined && !wordsProblem}
                        label={(l) => l.ui.page.newclass.field.generate.label}
                    />
                </Centered>

                {#if generateProblem}
                    <Notice text={(l) => l.ui.page.newclass.error.generate} />
                {/if}
            {:else}
                <MarkupHTMLView
                    markup={(l) =>
                        method === 'email'
                            ? l.ui.page.newclass.prompt.reviewEmail
                            : l.ui.page.newclass.prompt.review}
                />

                <Centered>
                    <Button
                        background
                        tip={(l) => l.ui.page.newclass.field.edit.tip}
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
                        label={(l) => l.ui.page.newclass.field.edit.label}
                    />
                </Centered>

                {@const taken = finalStudents
                    ?.filter((s) => usernamesTaken.includes(s.username))
                    .map((s) => s.username)}
                {#if taken !== undefined && taken.length > 0}
                    <Notice
                        ><LocalizedText
                            path={(l) => l.ui.page.newclass.error.taken}
                        />:
                        <em>{taken.join(', ')}</em></Notice
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
                                    ><LocalizedText
                                        path={(l) =>
                                            l.ui.page.login.field.username
                                                .placeholder}
                                    /></th
                                >
                                <!-- An email class has no passwords, and a
                                     column saying so in every row is a column
                                     that says nothing. -->
                                {#if method === 'password'}
                                    <th
                                        ><LocalizedText
                                            path={(l) =>
                                                l.ui.page.login.field.password
                                                    .placeholder}
                                        /></th
                                    >
                                {/if}
                            </tr>
                        </thead>
                        <tbody>
                            {#each generatedStudents as student, studentIndex}
                                <!-- The three lists are parallel: edited is a
                                     copy of generated, and final is whichever
                                     of them is in effect. -->
                                {@const edited = editedStudents?.[studentIndex]}
                                {@const final = finalStudents[studentIndex]}
                                {#if final !== undefined}
                                    <tr>
                                        {#each student.meta as cell, columnIndex}
                                            <td
                                                >{#if editing}
                                                    <TextField
                                                        id="new-student-{studentIndex}-data-{columnIndex}"
                                                        description={(l) =>
                                                            l.ui.page.newclass
                                                                .field.metadata
                                                                .description}
                                                        placeholder={(l) =>
                                                            l.ui.page.newclass
                                                                .field.metadata
                                                                .placeholder}
                                                        text={edited?.meta[
                                                            columnIndex
                                                        ] ?? cell}
                                                        editable={!submitting &&
                                                            !download}
                                                        changed={(text) =>
                                                            edited
                                                                ? (edited.meta[
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
                                                    id="new-student-{studentIndex}"
                                                    description={(l) =>
                                                        l.ui.page.login.field
                                                            .username
                                                            .description}
                                                    placeholder={(l) =>
                                                        l.ui.page.login.field
                                                            .username
                                                            .placeholder}
                                                    text={final.username}
                                                    validator={(text) =>
                                                        usernamesTaken.includes(
                                                            text,
                                                        )
                                                            ? (l) =>
                                                                  l.ui.page
                                                                      .newclass
                                                                      .error
                                                                      .taken
                                                            : true}
                                                    changed={(text) => {
                                                        // Update the username after it's changed.
                                                        edited
                                                            ? (edited.username =
                                                                  text)
                                                            : undefined;
                                                    }}
                                                    editable={!submitting &&
                                                        !download}
                                                    dwelled={async (
                                                        username,
                                                    ) => {
                                                        // After done editing, check whether the name can still
                                                        // be claimed. Only a definite "no" marks it taken: an
                                                        // undefined answer means we couldn't ask, and blocking
                                                        // submission on an unreachable server would strand a
                                                        // teacher mid-roster.
                                                        if (
                                                            (await usernameAvailable(
                                                                username,
                                                            )) === false
                                                        )
                                                            usernamesTaken.push(
                                                                username,
                                                            );
                                                    }}
                                                ></TextField>
                                            {:else}{final.username}
                                            {/if}</td
                                        >
                                        <!-- Only a password class has this column:
                                         an email student has no password at
                                         all, and the address they do sign in
                                         with is already the first cell. -->
                                        {#if method === 'password'}
                                            <td
                                                >{#if editing}
                                                    <TextField
                                                        id="new-student-{studentIndex}-final"
                                                        description={(l) =>
                                                            l.ui.page.login
                                                                .field.password
                                                                .description}
                                                        placeholder={(l) =>
                                                            l.ui.page.login
                                                                .field.password
                                                                .placeholder}
                                                        text={final.password}
                                                        editable={!submitting &&
                                                            !download}
                                                        changed={(text) =>
                                                            edited
                                                                ? (edited.password =
                                                                      text)
                                                                : undefined}
                                                    ></TextField>
                                                {:else}{final.password}
                                                {/if}</td
                                            >
                                        {/if}
                                    </tr>
                                {/if}
                            {/each}
                        </tbody>
                    </table>
                {/if}
            {/if}
        {/if}

        <!-- Also below the question, for the same reason everything else is:
             there is nothing to submit until the teacher has said what kind of
             class this is, and what happens on success differs by kind. -->
        {#if method !== undefined}
            <Subheader text={(l) => l.ui.page.newclass.subheader.submit} />
            <MarkupHTMLView
                markup={(l) =>
                    method === 'email'
                        ? l.ui.page.newclass.prompt.submitEmail
                        : l.ui.page.newclass.prompt.submit}
            />

            <Centered>
                <Button
                    background
                    tip={(l) => l.ui.page.newclass.field.submit.tip}
                    action={submit}
                    active={!download &&
                        !submitting &&
                        $user !== null &&
                        name.length > 0 &&
                        metadataProblem === undefined &&
                        method !== undefined &&
                        (method !== 'email' || affirmed) &&
                        (students.length === 0 ||
                            generatedStudents !== undefined) &&
                        finalStudents.every(
                            (s) =>
                                s.username.length >= UsernameLength &&
                                !usernamesTaken.includes(s.username) &&
                                // An email class has no passwords to be long
                                // enough.
                                (method === 'email' ||
                                    s.password.length >= PasswordLength),
                        )}
                    label={(l) => l.ui.page.newclass.field.submit.label}
                />
            </Centered>

            {#if createError}
                <Notice
                    ><LocalizedText
                        path={(l) =>
                            l.ui.page.newclass.error[createError!.kind]}
                    />: {createError.info}</Notice
                >
            {/if}
        {/if}
        {#if download === true}
            {#if finalStudents.length > 0}
                <MarkupHTMLView
                    markup={(l) =>
                        method === 'email'
                            ? l.ui.page.newclass.prompt.downloadEmail
                            : l.ui.page.newclass.prompt.download}
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

    /* `start`, not the default stretch: a stretched checkbox floats in the
       middle of a label that wraps to two lines. */
    .affirm {
        display: flex;
        flex-direction: row;
        align-items: start;
        gap: var(--wordplay-spacing);
    }
</style>
