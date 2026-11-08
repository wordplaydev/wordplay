<!-- Make one more student account in an existing password class, for a student
     who arrives after the class was made. Before this, a teacher's only way was
     to sign up as the student in a private window, then add the account. -->
<script lang="ts">
    import Spinning from '#components/app/Spinning.svelte';
    import Notice from '#components/app/Notice.svelte';
    import MarkupHTMLView from '#components/concepts/MarkupHTMLView.svelte';
    import { getAnnouncer } from '#components/project/Contexts.ts';
    import Button from '#components/widgets/Button.svelte';
    import LocalizedText from '#components/widgets/LocalizedText.svelte';
    import TextField from '#components/widgets/TextField.svelte';
    import { isValidUsername } from '#db/creators/username.ts';
    import { usernameAvailable } from '#db/creators/usernames.ts';
    import { locales } from '#db/Database.ts';
    import {
        createStudent,
        type Class,
    } from '#db/teachers/TeacherDatabase.svelte.ts';
    import type { LocaleTextAccessor } from '#locale/Locales.ts';
    import isValidPassword from '../../../login/IsValidPassword';

    let { classy }: { classy: Class } = $props();

    let username = $state('');
    let password = $state('');
    let available: boolean | undefined = $state(undefined);
    let checking = $state(false);
    let loading = $state(false);
    let error: LocaleTextAccessor | undefined = $state(undefined);
    /** The account just made, shown once so the teacher can write it down. */
    let created: { username: string; password: string } | undefined =
        $state(undefined);

    const announce = getAnnouncer();

    const complete = $derived(
        isValidUsername(username) &&
            available !== false &&
            isValidPassword(password),
    );

    async function create() {
        if (!complete) return;
        loading = true;
        error = undefined;
        created = undefined;
        const result = await createStudent(classy.id, username, password);
        loading = false;
        if (result.error === undefined) {
            created = { username: result.username, password };
            username = '';
            password = '';
            available = undefined;
            const made = result.username;
            if (announce && $announce)
                $announce(
                    'class-student',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize((l) => l.ui.page.class.prompt.created, {
                            username: made,
                        })
                        .toText(),
                );
            return;
        }
        // A taken name is said by the username field itself; a notice too would
        // say it twice.
        const said: LocaleTextAccessor =
            result.error === 'taken'
                ? (l) => l.ui.page.login.error.usernameTaken
                : result.error === 'limit'
                  ? (l) => l.ui.page.class.error.limit
                  : result.error === 'unverified'
                    ? (l) => l.ui.page.login.error.unverified
                    : (l) => l.ui.page.class.error.create;
        if (result.error === 'taken') available = false;
        else error = said;
        if (announce && $announce)
            $announce(
                'ignored',
                $locales.getLanguages()[0],
                $locales.getPrimaryPlainText(said),
            );
    }
</script>

<MarkupHTMLView markup={(l) => l.ui.page.class.prompt.newstudent} />

<form class="control-row" onsubmit={(event) => event.preventDefault()}>
    <TextField
        id="new-student-username"
        description={(l) => l.ui.page.login.field.username.description}
        placeholder={(l) => l.ui.page.login.field.username.placeholder}
        bind:text={username}
        editable={!loading}
        validator={(text) =>
            text === ''
                ? true
                : !isValidUsername(text)
                  ? (l) => l.ui.page.login.error.invalidUsername
                  : available === false
                    ? (l) => l.ui.page.login.error.usernameTaken
                    : true}
        changed={() => {
            if (available === false) available = undefined;
        }}
        dwelled={async (text) => {
            checking = true;
            // Only a definite "no" marks it taken; the server decides the rest.
            available = (await usernameAvailable(text)) !== false;
            checking = false;
        }}
    />
    <Spinning size={1} spin={checking}></Spinning>
    <TextField
        id="new-student-password"
        description={(l) => l.ui.page.login.field.password.description}
        placeholder={(l) => l.ui.page.login.field.password.placeholder}
        bind:text={password}
        editable={!loading}
        validator={(pass) =>
            pass === ''
                ? true
                : !isValidPassword(pass)
                  ? (l) => l.ui.page.login.error.invalidPassword
                  : true}
    />
    {#if loading}
        <Spinning></Spinning>
    {:else}
        <Button
            background
            submit
            tip={(l) => l.ui.page.class.field.create.tip}
            label={(l) => l.ui.page.class.field.create.label}
            active={complete}
            action={create}
            testid="new-student-button"
        />
    {/if}
</form>

{#if error}
    <Notice text={error} />
{/if}

{#if created}
    <div class="created" data-testid="new-student-created">
        <MarkupHTMLView
            markup={[
                (l) => l.ui.page.class.prompt.created,
                { username: created.username },
            ]}
        />
        <dl>
            <dt
                ><LocalizedText
                    path={(l) => l.ui.page.login.field.username.placeholder}
                /></dt
            >
            <dd>{created.username}</dd>
            <dt
                ><LocalizedText
                    path={(l) => l.ui.page.login.field.password.placeholder}
                /></dt
            >
            <dd>{created.password}</dd>
        </dl>
    </div>
{/if}

<style>
    dl {
        display: grid;
        grid-template-columns: auto 1fr;
        column-gap: var(--wordplay-spacing-double);
        row-gap: var(--wordplay-spacing-half);
    }

    dd {
        margin: 0;
        font-family: var(--wordplay-code-font);
    }
</style>
