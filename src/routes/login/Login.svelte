<script lang="ts">
    import isValidUsername from '@db/isValidUsername';
    import Header from '../../components/app/Header.svelte';
    import { locales } from '../../db/Database';
    import LoginForm from './LoginForm.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import isValidEmail from '@db/isValidEmail';
    import Button from '@components/widgets/Button.svelte';
    import { analytics, auth, functions } from '@db/firebase';
    import {
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
        signInWithEmailAndPassword,
        signInWithEmailLink,
    } from 'firebase/auth';
    import { Creator } from '@db/CreatorDatabase';
    import { FirebaseError } from 'firebase/app';
    import getAuthErrorDescription from './getAuthErrorDescription';
    import Spinning from '@components/app/Spinning.svelte';
    import isValidPassword from './IsValidPassword';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { logEvent } from 'firebase/analytics';
    import Note from '@components/widgets/Note.svelte';
    import { httpsCallable } from 'firebase/functions';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';

    /** The username typed into the text field */
    let username = '';
    let password = '';
    let email = '';

    /** When true, login submission button shows loading spinner */
    let loading = false;

    /** Feedback to show in the login form */
    let usernameFeedback: string | undefined = undefined;
    let emailFeedback: string | undefined = undefined;

    /** When the page is mounted, see if the link is an email sign in link, and if so, attempt to finish logging in. */
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishEmailLogin();
    });

    async function usernameSignin() {
        if (auth === undefined) return;
        if (!loginFormComplete()) return;

        // Create an email from the username
        const wordplayEmail = isValidEmail(username)
            ? username
            : Creator.usernameEmail(username);

        // See if the username exists by trying to log in with no password.
        loading = true;
        try {
            await signInWithEmailAndPassword(auth, wordplayEmail, password);
            goto('/profile');
        } catch (error) {
            if (error instanceof FirebaseError)
                usernameFeedback = getAuthErrorDescription($locales, error);
        } finally {
            loading = false;
        }
    }

    function loginFormComplete() {
        return (
            isValidPassword(password) &&
            (isValidUsername(username) || isValidEmail(username))
        );
    }

    async function emailSignin() {
        if (auth && functions && isValidEmail(email)) {
            loading = true;

            // Get missing info.
            const emailExists = httpsCallable<string>(functions, 'emailExists');
            const exists = (await emailExists(email)).data;

            try {
                /** If the account doesn't exist, do nothing */
                if (exists) {
                    /** If this is already a link, finish the login with the email they entered. */
                    if (isSignInWithEmailLink(auth, window.location.href))
                        finishEmailLogin();
                    else {
                        // Ask Firebase to send an email.
                        await sendSignInLinkToEmail(auth, email, {
                            url: `${location.origin}/login`,
                            handleCodeInApp: true,
                        });
                        // Remember the email in local storage so we don't have to ask for it again
                        // after returning to the link above.
                        window.localStorage.setItem('email', email);
                        emailFeedback = $locales.get(
                            (l) => l.ui.page.login.prompt.sent,
                        );
                    }
                } else {
                    emailFeedback = $locales.get(
                        (l) => l.ui.page.login.prompt.sent,
                    );
                }
            } catch (err) {
                emailFeedback = getAuthErrorDescription($locales, err);
            } finally {
                loading = false;
            }
        }
    }

    function finishEmailLogin(): string | undefined {
        if (auth) {
            try {
                // If this is on the same device and browser, then the email should be in local storage.
                const storedEmail = window.localStorage.getItem('email');

                // If there's no email, prompt for one.
                if (storedEmail === null && email === '') {
                    emailFeedback = $locales.get(
                        (l) => l.ui.page.login.prompt.enter,
                    );
                }
                // Sign in.
                else {
                    signInWithEmailLink(
                        auth,
                        storedEmail ?? email,
                        window.location.href,
                    ).then(() => {
                        // Remove the email we might have stored.
                        window.localStorage.removeItem('email');

                        // Provide success feedback (which likely won't be visible, since we're navigating immediately)
                        emailFeedback = $locales.get(
                            (l) => l.ui.page.login.prompt.success,
                        );

                        // Log login event in analytics
                        if (analytics) logEvent(analytics, 'login');

                        // Remove the query on the URL, showing the profile view.
                        goto('/profile');
                    });
                }
            } catch (err) {
                emailFeedback = getAuthErrorDescription($locales, err);
            }
        }
        return undefined;
    }
</script>

<!-- Provide some reasons to log in -->
<Header>{$locales.get((l) => l.ui.page.login.header)}</Header>

<LoginForm submit={usernameSignin} feedback={usernameFeedback}>
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.login.prompt.login)}
    />
    <div class="form">
        <TextField
            description={$locales.get(
                (l) => l.ui.page.login.field.username.description,
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.username.placeholder,
            )}
            bind:text={username}
            editable={!loading}
            validator={(text) => isValidUsername(text) || isValidEmail(text)}
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
            editable={!loading}
            validator={(pass) => isValidPassword(pass)}
        />
        {#if loading}
            <Spinning></Spinning>
        {:else}
            <Button
                background
                submit
                tip={$locales.get((l) => l.ui.page.login.button.login)}
                active={isValidPassword(password) &&
                    (isValidUsername(username) || isValidEmail(username))}
                action={() => undefined}>&gt;</Button
            >
        {/if}
    </div>
</LoginForm>

<MarkupHtmlView markup={$locales.get((l) => l.ui.page.login.prompt.forgot)} />

<LoginForm submit={emailSignin} feedback={emailFeedback}>
    <Note
        ><MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.login.prompt.email)}
        /></Note
    >
    <div class="form">
        <TextField
            kind={'email'}
            description={$locales.get(
                (l) => l.ui.page.login.field.email.description,
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.email.placeholder,
            )}
            bind:text={email}
            editable={!loading}
            validator={(text) => isValidEmail(text)}
        />
        {#if loading}
            <Spinning></Spinning>
        {:else}
            <Button
                background
                submit
                tip={$locales.get((l) => l.ui.page.login.button.login)}
                active={isValidEmail(email)}
                action={() => undefined}>&gt;</Button
            >
        {/if}
    </div>
</LoginForm>

<style>
    .form {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        align-items: baseline;
        justify-content: center;
        margin-top: 1em;
        margin-bottom: 1em;
    }
</style>
