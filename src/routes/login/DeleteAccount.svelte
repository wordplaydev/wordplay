<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { Creator } from '@db/CreatorDatabase';
    import type { User } from 'firebase/auth';
    import TextField from '../../components/widgets/TextField.svelte';
    import validEmail from '../../db/validEmail';
    import { DB, locales } from '@db/Database';

    export let user: User;

    $: creator = Creator.from(user);

    let deleteRequested = false;
    let confirmEmail: string;
    let deleteSubmitted = false;
    let successfullyDeleted: boolean | undefined = undefined;

    async function deleteAccount() {
        deleteSubmitted = true;
        successfullyDeleted = await DB.deleteAccount();
        return true;
    }

    function readyToDeleteAccount(email: string) {
        const finalEmail = creator.isUsername()
            ? Creator.usernameEmail(email)
            : email;
        return validEmail(finalEmail) && finalEmail === user.email;
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
                readyToDeleteAccount(confirmEmail)
                    ? deleteAccount()
                    : undefined}
        >
            <TextField
                description={$locales.get((l) =>
                    creator.isUsername()
                        ? l.ui.page.login.field.username.description
                        : l.ui.page.login.field.email.description
                )}
                placeholder={$locales.get((l) =>
                    creator.isUsername()
                        ? l.ui.page.login.field.username.placeholder
                        : l.ui.page.login.field.email.placeholder
                )}
                fill={true}
                kind={creator.isUsername() ? undefined : 'email'}
                bind:text={confirmEmail}
            />
            <Button
                background
                submit
                tip={$locales.get(
                    (l) => l.ui.page.login.button.reallyDelete.tip
                )}
                active={readyToDeleteAccount(confirmEmail)}
                action={deleteAccount}
                >{$locales.get(
                    (l) => l.ui.page.login.button.reallyDelete.label
                )}</Button
            >
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

<style>
    form {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>
