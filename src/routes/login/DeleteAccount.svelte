<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { Creator } from '@db/CreatorDatabase';
    import { signInWithEmailAndPassword, type User } from 'firebase/auth';
    import TextField from '../../components/widgets/TextField.svelte';
    import validEmail from '../../db/isValidEmail';
    import { DB, locales } from '@db/Database';
    import Feedback from '@components/app/Feedback.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { auth } from '@db/firebase';
    import isValidEmail from '../../db/isValidEmail';
    import isValidPassword from './IsValidPassword';

    export let user: User;

    $: creator = Creator.from(user);

    let deleteRequested = false;
    let confirmEmail: string;
    let password = '';
    let deleteSubmitted = false;
    let successfullyDeleted: boolean | undefined = undefined;
    let deleteFeedback: string | undefined = undefined;

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
            deleteFeedback = $locales.get(
                (l) => l.ui.page.login.error.wrongPassword,
            );
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
    <p>{$locales.get((l) => l.ui.page.login.prompt.delete)}</p>
    <p
        ><Button
            background
            tip={$locales.get((l) => l.ui.page.login.button.delete.tip)}
            action={() => (deleteRequested = !deleteRequested)}
            active={!deleteRequested}
            >{$locales.get((l) => l.ui.page.login.button.delete.label)}</Button
        >
    </p>
    {#if deleteRequested}
        <p aria-live="assertive">
            {$locales.get((l) => l.ui.page.login.prompt.reallyDelete)}
        </p>

        <form
            on:submit={() =>
                readyToDeleteAccount(confirmEmail, password)
                    ? deleteAccount()
                    : undefined}
        >
            <TextField
                description={$locales.get((l) =>
                    creator.isUsername()
                        ? l.ui.page.login.field.username.description
                        : l.ui.page.login.field.email.description,
                )}
                placeholder={$locales.get((l) =>
                    creator.isUsername()
                        ? l.ui.page.login.field.username.placeholder
                        : l.ui.page.login.field.email.placeholder,
                )}
                kind={creator.isUsername() ? undefined : 'email'}
                bind:text={confirmEmail}
                editable={!deleteSubmitted}
            />
            <TextField
                kind="password"
                description={$locales.get(
                    (l) => l.ui.page.login.field.password.description,
                )}
                placeholder={$locales.get(
                    (l) => l.ui.page.login.field.password.placeholder,
                )}
                bind:text={password}
                editable={!deleteSubmitted}
                validator={(pass) => isValidPassword(pass)}
            />
            <Button
                background
                submit
                tip={$locales.get(
                    (l) => l.ui.page.login.button.reallyDelete.tip,
                )}
                active={readyToDeleteAccount(confirmEmail, password)}
                action={deleteAccount}
                >{$locales.get(
                    (l) => l.ui.page.login.button.reallyDelete.label,
                )}</Button
            >
            {#if confirmEmail?.length >= 5 && !readyToDeleteAccount(confirmEmail, password)}
                <Feedback inline
                    ><MarkupHtmlView
                        inline
                        markup={$locales.get(
                            (l) => l.ui.page.login.feedback.match,
                        )}
                    /></Feedback
                >
            {/if}
        </form>
    {/if}
{:else if successfullyDeleted === undefined}
    <p>{$locales.get((l) => l.ui.page.login.feedback.deleting)}</p>
    <p
        ><Spinning
            label={$locales.get((l) => l.ui.page.login.feedback.deleting)}
        /></p
    >{:else if successfullyDeleted === false}
    <p aria-live="assertive"
        >{$locales.get((l) => l.ui.page.login.error.delete)}</p
    >
{/if}

{#if deleteFeedback}
    <Feedback>{deleteFeedback}</Feedback>
{/if}

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>
