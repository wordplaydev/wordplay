<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import { getUser } from '@components/project/Contexts';
    import Header from '@components/app/Header.svelte';
    import Button from '@components/widgets/Button.svelte';
    import {
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
        signInWithEmailLink,
        updateEmail,
        updateProfile,
    } from 'firebase/auth';
    import { FirebaseError } from 'firebase/app';
    import { analytics, auth, firestore } from '@db/firebase';
    import { onMount } from 'svelte';
    import { DB, Projects, locale } from '../../db/Database';
    import Feedback from '../../components/app/Feedback.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import validateEmail from '../../db/validEmail';
    import Spinning from '../../components/app/Spinning.svelte';
    import Link from '../../components/app/Link.svelte';
    import { logEvent } from 'firebase/analytics';
    import EmojiChooser from '../../components/widgets/EmojiChooser.svelte';

    let user = getUser();
    let email: string;
    let missingEmail = false;
    let sent = false;
    let success: boolean | undefined = undefined;
    let loginFeedback = '';
    let changeSubmitted = false;
    let changeFeedback: string | undefined = undefined;
    let deleteRequested = false;
    let deleteSubmitted = false;
    let confirmEmail: string;
    let successfullyDeleted: boolean | undefined = undefined;

    let Errors: Record<string, string>;
    $: Errors = {
        'auth/id-token-expired': $locale.ui.page.login.error.expired,
        'auth/id-token-revoked': $locale.ui.page.login.error.invalid,
        'auth/invalid-argument': $locale.ui.page.login.error.invalid,
        'auth/invalid-email': $locale.ui.page.login.error.email,
    };

    function communicateLoginFailure(err: unknown) {
        if (err instanceof FirebaseError) {
            console.error(err.code);
            console.error(err.message);
            loginFeedback =
                Errors[err.code] ?? $locale.ui.page.login.error.failure;
        } else {
            console.error(err);
            loginFeedback = $locale.ui.page.login.error.failure;
        }
        success = false;
    }

    function finishLogin() {
        if (auth) {
            try {
                // If this is on the same device and browser, then the email should be in local storage.
                let storedEmail = window.localStorage.getItem('email');

                // If there's no email, prompt for one.
                if (storedEmail === null && email === '') {
                    missingEmail = true;
                }
                // If no user, create an account with the email.
                else if ($user === null) {
                    signInWithEmailLink(
                        auth,
                        storedEmail ?? email,
                        window.location.href
                    )
                        .then(() => {
                            window.localStorage.removeItem('email');
                            success = true;

                            // Log login
                            if (analytics) logEvent(analytics, 'login');
                        })
                        .catch((err) => communicateLoginFailure(err));
                }
            } catch (err) {
                communicateLoginFailure(err);
            }
        }
    }

    async function startLogin() {
        if (auth) {
            try {
                if (isSignInWithEmailLink(auth, window.location.href))
                    finishLogin();
                else {
                    // Ask Firebase to send an email.
                    await sendSignInLinkToEmail(auth, email, {
                        url: `${location.origin}/login`,
                        handleCodeInApp: true,
                    });
                    // Remember the email in local storage so we don't have to ask for it again
                    // after returning to the link above.
                    window.localStorage.setItem('email', email);
                    sent = true;
                }
            } catch (err) {
                communicateLoginFailure(err);
            }
        }
    }

    async function update() {
        const user = DB.getUser();
        if (auth === undefined || user === null || user.email === null) return;

        // Enter loading state, try to login and wait for it to complete, and then leave loading state.
        // Give some feedback when loading.
        changeSubmitted = true;
        try {
            await updateEmail(user, email);
            changeFeedback = $locale.ui.page.login.prompt.confirm;
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
                    Errors[error.code] ?? $locale.ui.page.login.error.unchanged;
            }
        } finally {
            changeSubmitted = false;
        }
    }

    async function logout() {
        // First, delete the local projects database for privacy.
        await Projects.deleteLocal();
        // Then sign out.
        if (auth) await auth.signOut();

        // We don't delete local storage, since the settings aren't privacy sensitive and are device-specific.
    }

    async function deleteAccount() {
        deleteSubmitted = true;
        successfullyDeleted = await DB.deleteAccount();
        return true;
    }

    function readyToDeleteAccount(email: string) {
        return validateEmail(email) && email === $user?.email;
    }

    // If it's a sign in, finish signing in once authenticated.
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishLogin();
    });

    function rename(name: string) {
        if ($user)
            // This should trigger an update to the user store, and therefore this view.
            updateProfile($user, {
                displayName: name,
            }).then(() => $user?.reload());
    }
</script>

<Writing>
    {#if auth && firestore}
        {#if $user}
            <Header
                ><span style:font-family="Noto Color Emoji"
                    >{$user.displayName ?? '😃'}</span
                >{$user.email}</Header
            >

            <div class="actions">
                <div class="action">
                    <p>{$locale.ui.page.login.prompt.play}</p>
                    <p
                        ><Link to="/projects"
                            >{$locale.ui.page.projects.header}</Link
                        ></p
                    >
                </div>
                <div class="action">
                    <p>{$locale.ui.page.login.prompt.name}</p>
                    <EmojiChooser
                        pick={(name) => rename(name)}
                        emoji={$user?.displayName ?? ''}
                    />
                </div>
                <div class="action">
                    <p>{$locale.ui.page.login.prompt.logout}</p>
                    <p
                        ><Button
                            background
                            tip={$locale.ui.page.login.button.logout.tip}
                            action={logout}
                            >{$locale.ui.page.login.button.logout.label}</Button
                        ></p
                    >
                </div>
                <div class="action">
                    <p>{$locale.ui.page.login.prompt.change}</p>
                    <form on:submit={update}>
                        <TextField
                            description={$locale.ui.page.login.field.email
                                .description}
                            placeholder={$locale.ui.page.login.field.email
                                .placeholder}
                            bind:text={email}
                            editable={!changeSubmitted}
                        /><Button
                            submit
                            tip={$locale.ui.page.login.button.update}
                            active={validateEmail(email)}
                            action={() => undefined}>&gt;</Button
                        >
                        {#if changeSubmitted}<Spinning
                                label={$locale.ui.page.login.feedback.changing}
                            />
                        {:else if changeFeedback}<Feedback inline
                                >{changeFeedback}</Feedback
                            >{/if}
                    </form>
                </div>
                <div class="action"
                    >{#if !deleteSubmitted}
                        <p>{$locale.ui.page.login.prompt.delete}</p>
                        <p
                            ><Button
                                background
                                tip={$locale.ui.page.login.button.delete.tip}
                                action={() =>
                                    (deleteRequested = !deleteRequested)}
                                active={!deleteRequested}
                                >{$locale.ui.page.login.button.delete
                                    .label}</Button
                            >
                        </p>
                        {#if deleteRequested}
                            <p aria-live="assertive">
                                {$locale.ui.page.login.prompt.reallyDelete}
                            </p>

                            <form
                                on:submit={() =>
                                    readyToDeleteAccount(confirmEmail)
                                        ? deleteAccount()
                                        : undefined}
                            >
                                <TextField
                                    description={$locale.ui.page.login.field
                                        .email.description}
                                    placeholder={$locale.ui.page.login.field
                                        .email.placeholder}
                                    fill={true}
                                    bind:text={confirmEmail}
                                />
                                <Button
                                    background
                                    submit
                                    tip={$locale.ui.page.login.button
                                        .reallyDelete.tip}
                                    active={readyToDeleteAccount(confirmEmail)}
                                    action={deleteAccount}
                                    >{$locale.ui.page.login.button.reallyDelete
                                        .label}</Button
                                >
                            </form>
                        {/if}
                    {:else}
                        {#if successfullyDeleted === undefined}
                            <p>{$locale.ui.page.login.feedback.deleting}</p>
                            <p
                                ><Spinning
                                    label={$locale.ui.page.login.feedback
                                        .deleting}
                                /></p
                            >{:else if successfullyDeleted === false}
                            <p aria-live="assertive"
                                >{$locale.ui.page.login.error.delete}</p
                            >
                        {/if}
                    {/if}
                </div>
            </div>
        {:else}
            <Header>{$locale.ui.page.login.header}</Header>
            <p>
                {#if missingEmail}
                    {$locale.ui.page.login.prompt.enter}
                {:else if $user === null}
                    {$locale.ui.page.login.prompt.login}
                {/if}
            </p>
            <form on:submit={startLogin}>
                <TextField
                    description={$locale.ui.page.login.field.email.description}
                    placeholder={$locale.ui.page.login.field.email.placeholder}
                    bind:text={email}
                /><Button
                    submit
                    tip={$locale.ui.page.login.button.login}
                    active={validateEmail(email)}
                    action={() => undefined}>&gt;</Button
                >
            </form>
            <p>
                {#if sent === true}
                    <Feedback>{$locale.ui.page.login.prompt.sent}</Feedback>
                {:else if success === true}
                    <Feedback>{$locale.ui.page.login.prompt.success}</Feedback>
                {:else if success === false}
                    <Feedback>{loginFeedback}</Feedback>
                {/if}
            </p>
        {/if}
    {:else}
        <Feedback>{$locale.ui.page.login.error.offline}</Feedback>
    {/if}
</Writing>

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
