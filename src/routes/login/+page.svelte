<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import Page from '@components/app/Page.svelte';
    import { preferredLocales } from '@translation/locales';
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

    let user = getUser();
    let email: string;
    let missingEmail: boolean = false;
    let sent: boolean = false;
    let success: boolean | undefined = undefined;
    let error: string = '';

    function redirect() {
        window.localStorage.removeItem('email');
        success = true;
        goto('/projects');
    }

    function fail(err: any) {
        if (err instanceof FirebaseError) {
            console.error(err.code);
            console.error(err.message);
            error =
                {
                    'auth/id-token-expired':
                        $preferredLocales[0].ui.login.expiredFailure,
                    'auth/id-token-revoked':
                        $preferredLocales[0].ui.login.invalidFailure,
                    'auth/invalid-argument':
                        $preferredLocales[0].ui.login.invalidFailure,
                    'auth/invalid-email':
                        $preferredLocales[0].ui.login.emailFailure,
                }[err.code] ?? $preferredLocales[0].ui.login.failure;
        } else {
            console.error(err);
            error = $preferredLocales[0].ui.login.failure;
        }
        success = false;
    }

    function finish() {
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

    async function login() {
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

    function logout() {
        auth.signOut();
    }

    // If it's a sign in, finish signing in once authenticated.
    onMount(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) finish();
    });
</script>

<Page>
    <div class="login">
        {#if $user && !$user.isAnonymous}
            <Lead>{$preferredLocales[0].welcome} {$user.email}</Lead>
            <Button tip={$preferredLocales[0].ui.login.logout} action={logout}
                >{$preferredLocales[0].ui.login.logout}</Button
            >
        {:else}
            <Lead>{$preferredLocales[0].ui.login.header}</Lead>
            <p>
                {#if missingEmail}
                    {$preferredLocales[0].ui.login.enterEmail}
                {:else if $user === null}
                    {$preferredLocales[0].ui.login.anonymousPrompt}
                {:else}
                    {$preferredLocales[0].ui.login.prompt}
                {/if}
            </p>
            <form class="form" on:submit={login}>
                <TextField
                    placeholder={$preferredLocales[0].ui.placeholders.email}
                    bind:text={email}
                /><Button
                    tip={$preferredLocales[0].ui.login.submit}
                    enabled={/^.+@.+$/.test(email)}
                    action={() => undefined}>&gt;</Button
                >
            </form>
            <p>
                {#if sent === true}
                    {$preferredLocales[0].ui.login.sent}
                {:else if success === true}
                    {$preferredLocales[0].ui.login.success}
                {:else if success === false}
                    {error}
                {/if}
            </p>
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
