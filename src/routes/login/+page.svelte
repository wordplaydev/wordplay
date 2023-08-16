<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import Page from '@components/app/Page.svelte';
    import { getUser } from '@components/project/Contexts';
    import Lead from '@components/app/Lead.svelte';
    import Button from '@components/widgets/Button.svelte';
    import {
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
        signInWithEmailLink,
    } from 'firebase/auth';
    import { FirebaseError } from 'firebase/app';
    import { auth } from '@db/firebase';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { locale } from '../../db/Database';
    import Feedback from '../../components/app/Feedback.svelte';

    let user = getUser();
    let email: string;
    let missingEmail = false;
    let sent = false;
    let success: boolean | undefined = undefined;
    let error = '';

    function redirect() {
        window.localStorage.removeItem('email');
        success = true;
        goto('/projects');
    }

    function fail(err: unknown) {
        if (err instanceof FirebaseError) {
            console.error(err.code);
            console.error(err.message);
            error =
                {
                    'auth/id-token-expired': $locale.ui.login.expiredFailure,
                    'auth/id-token-revoked': $locale.ui.login.invalidFailure,
                    'auth/invalid-argument': $locale.ui.login.invalidFailure,
                    'auth/invalid-email': $locale.ui.login.emailFailure,
                }[err.code] ?? $locale.ui.login.failure;
        } else {
            console.error(err);
            error = $locale.ui.login.failure;
        }
        success = false;
    }

    function finish() {
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
                            redirect();
                        })
                        .catch((err) => fail(err));
                }
            } catch (err) {
                fail(err);
            }
        }
    }

    async function login() {
        if (auth) {
            try {
                if (isSignInWithEmailLink(auth, window.location.href)) finish();
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
                fail(err);
            }
        }
    }

    function logout() {
        if (auth) auth.signOut();
    }

    // If it's a sign in, finish signing in once authenticated.
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href)) finish();
    });
</script>

<Page>
    <div class="login">
        {#if auth}
            {#if $user && !$user.isAnonymous}
                <Lead>{$locale.ui.phrases.welcome} {$user.email}</Lead>
                <Button tip={$locale.ui.login.logout} action={logout}
                    >{$locale.ui.login.logout}</Button
                >
            {:else}
                <Lead>{$locale.ui.login.header}</Lead>
                <p>
                    {#if missingEmail}
                        {$locale.ui.login.enterEmail}
                    {:else if $user === null}
                        {$locale.ui.login.anonymousPrompt}
                    {:else}
                        {$locale.ui.login.prompt}
                    {/if}
                </p>
                <form class="form" on:submit={login}>
                    <TextField
                        description={$locale.ui.description.loginEmail}
                        placeholder={$locale.ui.placeholders.email}
                        bind:text={email}
                    /><Button
                        tip={$locale.ui.login.submit}
                        active={/^.+@.+$/.test(email)}
                        action={() => undefined}>&gt;</Button
                    >
                </form>
                <p>
                    {#if sent === true}
                        {$locale.ui.login.sent}
                    {:else if success === true}
                        {$locale.ui.login.success}
                    {:else if success === false}
                        {error}
                    {/if}
                </p>
            {/if}
        {:else}
            <Feedback>No connection to the server, so no logins.</Feedback>
        {/if}
    </div>
</Page>

<style>
    .login {
        width: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .form {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        font-size: x-large;
        margin: var(--wordplay-spacing);
    }
</style>
