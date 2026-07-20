<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { DB } from '@db/Database';
    import { ensureAuth } from '@db/firebase';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { signInWithEmailAndPassword, type User } from 'firebase/auth';
    import TextField from '@components/widgets/TextField.svelte';
    import {
        default as isValidEmail,
        default as validEmail,
    } from '@db/creators/isValidEmail';
    import isValidPassword from './IsValidPassword';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let creator = $derived(Creator.from(user));

    // Edits not yet saved online (across every domain). Deleting the account
    // wipes the local cache, so block it while there's unsaved work.
    let unsaved = $derived(DB.getUnsavedCount());

    let deleteRequested = $state(false);
    let confirmEmail: string = $state('');
    let password = $state('');
    let deleteSubmitted = $state(false);
    let deleteResult: 'deleted' | 'failed' | 'partial' | undefined =
        $state(undefined);
    let deleteFeedback: LocaleTextAccessor | undefined = $state(undefined);

    async function deleteAccount() {
        const auth = await ensureAuth();
        if (auth === undefined) return;

        deleteSubmitted = true;

        const email = isValidEmail(confirmEmail)
            ? confirmEmail
            : Creator.usernameEmail(confirmEmail);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            deleteResult = await DB.deleteAccount();
            // On anything but a clean delete, DB.deleteAccount has already
            // raised the top banner; drop back to the form so the user can
            // retry. On success the auth state change navigates away.
            if (deleteResult !== 'deleted') deleteSubmitted = false;
        } catch (error) {
            deleteFeedback = (l) => l.ui.page.login.error.wrongPassword;
            deleteSubmitted = false;
        }
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
    {#if unsaved > 0}
        <Notice text={(l) => l.ui.page.login.error.unsaved} />
    {/if}
    <p
        ><Button
            background
            tip={(l) => l.ui.page.login.button.delete.tip}
            action={() => (deleteRequested = !deleteRequested)}
            active={!deleteRequested && unsaved === 0}
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
{:else if deleteResult === undefined}
    <p><LocalizedText path={(l) => l.ui.page.login.feedback.deleting} /></p>
    <p><Spinning label={(l) => l.ui.page.login.feedback.deleting} /></p>
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
