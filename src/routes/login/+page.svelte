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
    } from 'firebase/auth';
    import { FirebaseError } from 'firebase/app';
    import { auth, firestore } from '@db/firebase';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { DB, locale } from '../../db/Database';
    import Feedback from '../../components/app/Feedback.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import validateEmail from '../../db/validEmail';
    import Spinning from '../../components/app/Spinning.svelte';

    let user = getUser();
    let email: string;
    let missingEmail = false;
    let sent = false;
    let success: boolean | undefined = undefined;
    let loginFeedback = '';
    let changeSubmitted = false;
    let changeFeedback: string | undefined = undefined;

    function communicateLoginFailure(err: unknown) {
        if (err instanceof FirebaseError) {
            console.error(err.code);
            console.error(err.message);
            loginFeedback =
                {
                    'auth/id-token-expired':
                        $locale.ui.page.login.error.expired,
                    'auth/id-token-revoked':
                        $locale.ui.page.login.error.invalid,
                    'auth/invalid-argument':
                        $locale.ui.page.login.error.invalid,
                    'auth/invalid-email': $locale.ui.page.login.error.other,
                }[err.code] ?? $locale.ui.page.login.error.failure;
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
                            goto('/projects');
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

    let errors: Record<string, string>;
    $: errors = {
        'auth/invalid-mail': $locale.ui.page.login.error.email,
    };

    async function update() {
        const user = DB.getUser();
        if (auth === undefined || user === null || user.email === null) return;

        // Enter loading state, try to login and wait for it to complete, and then leave loading state.
        // Give some feedback when loading.
        changeSubmitted = true;
        const previousEmail = user.email;
        try {
            await updateEmail(user, email);
            changeFeedback = `Check your original email address, ${previousEmail}, for a confirmation link.`;
        } catch (error) {
            if (
                error !== null &&
                typeof error === 'object' &&
                'code' in error &&
                typeof error.code === 'string'
            )
                changeFeedback =
                    errors[error.code] ??
                    "Couldn't update email for an unknown reason.";
        } finally {
            changeSubmitted = false;
        }
    }

    function logout() {
        if (auth) auth.signOut();
    }

    // If it's a sign in, finish signing in once authenticated.
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishLogin();
    });
</script>

<Writing>
    {#if auth && firestore}
        {#if $user}
            <Header>{$user.email}</Header>
            <p>{$locale.ui.page.login.prompt.play}</p>
            <p
                >{$locale.ui.page.login.prompt.logout}
                <Button
                    background
                    tip={$locale.ui.page.login.button.logout.tip}
                    action={logout}
                    >{$locale.ui.page.login.button.logout.label}</Button
                ></p
            >
            <p>{$locale.ui.page.login.prompt.change}</p>
            <form class="form" on:submit={update}>
                <p
                    ><TextField
                        description={$locale.ui.page.login.field.email
                            .description}
                        placeholder={$locale.ui.page.login.field.email
                            .placeholder}
                        bind:text={email}
                        editable={!changeSubmitted}
                    /><Button
                        tip={$locale.ui.page.login.button.update}
                        active={validateEmail(email)}
                        action={() => undefined}>&gt;</Button
                    ></p
                >
            </form>
            <p>
                {#if changeSubmitted}<Spinning />
                {:else if changeFeedback}<Feedback inline
                        >{changeFeedback}</Feedback
                    >{/if}</p
            >
        {:else}
            <Header>{$locale.ui.page.login.header}</Header>
            <p>
                {#if missingEmail}
                    {$locale.ui.page.login.prompt.enter}
                {:else if $user === null}
                    {$locale.ui.page.login.prompt.login}
                {/if}
            </p>
            <form class="form" on:submit={startLogin}>
                <TextField
                    description={$locale.ui.page.login.field.email.description}
                    placeholder={$locale.ui.page.login.field.email.placeholder}
                    bind:text={email}
                /><Button
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
    .form {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
    }
</style>
