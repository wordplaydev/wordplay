<script lang="ts">
    import { updateEmail, updateProfile, type User } from 'firebase/auth';
    import Header from '../../components/app/Header.svelte';
    import { DB, locales } from '../../db/Database';
    import Link from '../../components/app/Link.svelte';
    import EmojiChooser from '../../components/widgets/EmojiChooser.svelte';
    import Button from '../../components/widgets/Button.svelte';
    import { auth } from '../../db/firebase';
    import TextField from '../../components/widgets/TextField.svelte';
    import Spinning from '../../components/app/Spinning.svelte';
    import validEmail from '../../db/validEmail';
    import Feedback from '../../components/app/Feedback.svelte';
    import { isModerator } from '../../models/Moderation';
    import { getLoginErrorDescription } from './login';
    import { HiddenUsernameEmailDomain } from '../../db/Creator';

    export let user: User;

    $: username = user.email?.endsWith(HiddenUsernameEmailDomain);

    let newEmail: string;

    let changeSubmitted = false;
    let changeFeedback: string | undefined = undefined;
    let deleteRequested = false;
    let deleteSubmitted = false;
    let confirmEmail: string;
    let successfullyDeleted: boolean | undefined = undefined;

    let moderator = false;
    $: isModerator(user).then((mod) => (moderator = mod));

    function rename(name: string) {
        // This should trigger an update to the user store, and therefore this view.
        updateProfile(user, {
            displayName: name,
        }).then(() => user.reload());
    }

    async function logout() {
        // Then sign out. (Projects will be deleted locally by the project database when user updates.)
        if (auth) await auth.signOut();
    }

    async function update() {
        // Enter loading state, try to login and wait for it to complete, and then leave loading state.
        // Give some feedback when loading.
        changeSubmitted = true;
        try {
            await updateEmail(user, newEmail);
            changeFeedback = $locales.get(
                (l) => l.ui.page.login.prompt.confirm
            );
        } catch (error) {
            if (
                error !== null &&
                typeof error === 'object' &&
                'code' in error &&
                typeof error.code === 'string' &&
                'message' in error &&
                typeof error.message === 'string'
            ) {
                console.error(error.code);
                console.error(error.message);
                changeFeedback =
                    getLoginErrorDescription(error.code, $locales) ??
                    $locales.get((l) => l.ui.page.login.error.unchanged);
            }
        } finally {
            changeSubmitted = false;
        }
    }

    async function deleteAccount() {
        deleteSubmitted = true;
        successfullyDeleted = await DB.deleteAccount();
        return true;
    }

    function readyToDeleteAccount(email: string) {
        const finalEmail = username
            ? `${email}${HiddenUsernameEmailDomain}`
            : email;
        return validEmail(finalEmail) && finalEmail === user.email;
    }
</script>

<Header
    ><span style:font-family="Noto Color Emoji">{user.displayName ?? '😃'}</span
    >{user.email?.replace(HiddenUsernameEmailDomain, '')}</Header
>

<div class="actions">
    <div class="action">
        <p>{$locales.get((l) => l.ui.page.login.prompt.play)}</p>
        <p
            ><Link to="/projects"
                >{$locales.get((l) => l.ui.page.projects.header)}</Link
            ></p
        >
    </div>
    <div class="action">
        <p>{$locales.get((l) => l.ui.page.login.prompt.name)}</p>
        <EmojiChooser
            pick={(name) => rename(name)}
            emoji={user.displayName ?? ''}
        />
    </div>
    <div class="action">
        <p>{$locales.get((l) => l.ui.page.login.prompt.logout)}</p>
        <p
            ><Button
                background
                tip={$locales.get((l) => l.ui.page.login.button.logout.tip)}
                action={logout}
                >{$locales.get(
                    (l) => l.ui.page.login.button.logout.label
                )}</Button
            ></p
        >
    </div>
    {#if user && !username}
        <div class="action">
            <p>{$locales.get((l) => l.ui.page.login.prompt.change)}</p>
            <form on:submit={update}>
                <TextField
                    description={$locales.get(
                        (l) => l.ui.page.login.field.email.description
                    )}
                    placeholder={$locales.get(
                        (l) => l.ui.page.login.field.email.placeholder
                    )}
                    bind:text={newEmail}
                    editable={!changeSubmitted}
                /><Button
                    submit
                    tip={$locales.get((l) => l.ui.page.login.button.update)}
                    active={validEmail(newEmail)}
                    action={() => undefined}>&gt;</Button
                >
                {#if changeSubmitted}<Spinning
                        label={$locales.get(
                            (l) => l.ui.page.login.feedback.changing
                        )}
                    />
                {:else if changeFeedback}<Feedback inline
                        >{changeFeedback}</Feedback
                    >{/if}
            </form>
        </div>
    {/if}
    <div class="action"
        >{#if !deleteSubmitted}
            <p>{$locales.get((l) => l.ui.page.login.prompt.delete)}</p>
            <p
                ><Button
                    background
                    tip={$locales.get((l) => l.ui.page.login.button.delete.tip)}
                    action={() => (deleteRequested = !deleteRequested)}
                    active={!deleteRequested}
                    >{$locales.get(
                        (l) => l.ui.page.login.button.delete.label
                    )}</Button
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
                            username
                                ? l.ui.page.login.field.username.description
                                : l.ui.page.login.field.email.description
                        )}
                        placeholder={$locales.get((l) =>
                            username
                                ? l.ui.page.login.field.username.placeholder
                                : l.ui.page.login.field.email.placeholder
                        )}
                        fill={true}
                        kind={username ? undefined : 'email'}
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
        {:else}
            {#if successfullyDeleted === undefined}
                <p>{$locales.get((l) => l.ui.page.login.feedback.deleting)}</p>
                <p
                    ><Spinning
                        label={$locales.get(
                            (l) => l.ui.page.login.feedback.deleting
                        )}
                    /></p
                >{:else if successfullyDeleted === false}
                <p aria-live="assertive"
                    >{$locales.get((l) => l.ui.page.login.error.delete)}</p
                >
            {/if}
        {/if}
    </div>
    {#if moderator}
        <div class="action">
            You're a moderator. Go <Link to="/moderate">moderate</Link>?
        </div>
    {/if}
</div>

<style>
    form {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }

    .actions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .action {
        min-width: 15em;
        width: 40%;
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }
</style>
