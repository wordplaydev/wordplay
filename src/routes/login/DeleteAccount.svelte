<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { DB } from '@db/Database';
    import { auth } from '@db/firebase';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { signInWithEmailAndPassword, type User } from 'firebase/auth';
    import TextField from '../../components/widgets/TextField.svelte';
    import {
        default as isValidEmail,
        default as validEmail,
    } from '../../db/creators/isValidEmail';
    import isValidPassword from './IsValidPassword';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let creator = $derived(Creator.from(user));

    let deleteRequested = $state(false);
    let confirmEmail: string = $state('');
    let password = $state('');
    let deleteSubmitted = $state(false);
    let successfullyDeleted: boolean | undefined = $state(undefined);
    let deleteFeedback: LocaleTextAccessor | undefined = $state(undefined);

    async function deleteAccount() {
        if (auth === undefined) return;

        deleteSubmitted = true;

        const email = isValidEmail(confirmEmail)
            ? confirmEmail
            : Creator.usernameEmail(confirmEmail);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            successfullyDeleted = await DB.deleteAccount();
        } catch (error) {
            deleteFeedback = (l) => l.ui.page.login.error.wrongPassword;
        }
        deleteSubmitted = false;
    }

    function readyToDeleteAccount(email: string, pass: string) {
        const finalEmail = creator.isUsername()
            ? Creator.usernameEmail(email)
            : email;
        return (
            validEmail(finalEmail) &&
            finalEmail === user.email &&
            isValidPassword(pass)
        );
    }
</script>

{#if !deleteSubmitted}
    <p><LocalizedText path={(l) => l.ui.page.login.prompt.delete} /></p>
    <p
        ><Button
            background
            tip={(l) => l.ui.page.login.button.delete.tip}
            action={() => (deleteRequested = !deleteRequested)}
            active={!deleteRequested}
            label={(l) => l.ui.page.login.button.delete.label}
        />
    </p>
    {#if deleteRequested}
        <p aria-live="assertive">
            <LocalizedText path={(l) => l.ui.page.login.prompt.reallyDelete} />
        </p>

        <form
            onsubmit={() =>
                readyToDeleteAccount(confirmEmail, password)
                    ? deleteAccount()
                    : undefined}
        >
            <TextField
                id="delete-account-username"
                description={creator.isUsername()
                    ? (l) => l.ui.page.login.field.username.description
                    : (l) => l.ui.page.login.field.email.description}
                placeholder={creator.isUsername()
                    ? (l) => l.ui.page.login.field.username.placeholder
                    : (l) => l.ui.page.login.field.email.placeholder}
                kind={creator.isUsername() ? undefined : 'email'}
                bind:text={confirmEmail}
                editable={!deleteSubmitted}
            />
            <TextField
                kind="password"
                id="delete-account-password"
                description={(l) => l.ui.page.login.field.password.description}
                placeholder={(l) => l.ui.page.login.field.password.placeholder}
                bind:text={password}
                editable={!deleteSubmitted}
                validator={(pass) =>
                    isValidPassword(pass)
                        ? true
                        : (l) => l.ui.page.login.error.invalidPassword}
            />
            <Button
                background
                submit
                tip={(l) => l.ui.page.login.button.reallyDelete.tip}
                active={readyToDeleteAccount(confirmEmail, password)}
                action={deleteAccount}
                label={(l) => l.ui.page.login.button.reallyDelete.label}
            />
            {#if confirmEmail?.length >= 5 && !readyToDeleteAccount(confirmEmail, password)}
                <Notice inline
                    ><MarkupHTMLView
                        inline
                        markup={(l) => l.ui.page.login.feedback.match}
                    /></Notice
                >
            {/if}
        </form>
    {/if}
{:else if successfullyDeleted === undefined}
    <p><LocalizedText path={(l) => l.ui.page.login.feedback.deleting} /></p>
    <p><Spinning label={(l) => l.ui.page.login.feedback.deleting} /></p
    >{:else if successfullyDeleted === false}
    <p aria-live="assertive"
        ><LocalizedText path={(l) => l.ui.page.login.error.delete} /></p
    >
{/if}

{#if deleteFeedback}
    <Notice text={deleteFeedback} />
{/if}

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>
