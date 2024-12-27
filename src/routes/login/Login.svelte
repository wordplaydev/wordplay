<script module lang="ts">
    import type { FieldText, ButtonText, ToggleText } from '@locale/UITexts';

    export type LoginPageText = {
        /** Header for the login page when not logged in */
        header: string;
        /** Subtitle for the header link on the landing page */
        subtitle: string;
        prompt: {
            /** Prompts creator to login to save their work */
            login: string;
            /** Prompt to join on the login page */
            join: string;
            /** Forgot password regrets */
            forgot: string;
            /** Email login explanation */
            email: string;
            /** Prompt to check email for a login link. */
            sent: string;
            /** Tells the creator that they can change their email address. */
            changeEmail: string;
            /** Tells the creator that they can cahnge their password */
            changePassword: string;
            /** Asks the creator to enter their email if they opened the email link in a different browser. */
            enter: string;
            /** Encouragement to go create after logging in. */
            play: string;
            /** Description of password rules */
            passwordrule: string;
            /** Reminder to write down password */
            passwordreminder: string;
            /** Too young feedback */
            tooyoung: string;
            /** Offers to log out the creator. */
            logout: string;
            /** Shown briefly before page redirects to projects */
            success: string;
            /** Prompts creator to check their original email to confirm the email change */
            confirm: string;
            /** Offers to delete account */
            delete: string;
            /** Offers to really delete account forever */
            reallyDelete: string;
            /** Pick an emoji as a name */
            name: string;
        };
        /** Shown in the footer a creator is not logged in. */
        anonymous: string;
        field: {
            /** The login email */
            email: FieldText;
            /** The login username */
            username: FieldText;
            /** The login password */
            password: FieldText;
            /** The old password */
            currentPassword: FieldText;
            /** The new password */
            newPassword: FieldText;
        };
        feedback: {
            /** Change email pending */
            changing: string;
            /** Account deleting pending */
            deleting: string;
            /** Password successfully updated */
            updatedPassword: string;
            /** Email or username must match to delete account */
            match: string;
        };
        error: {
            /** Shown when the login link expired */
            expired: string;
            /** Shown when the login link isn't valid */
            invalid: string;
            /** Shown when the email address isn't valid */
            email: string;
            /** Unknown failure to login */
            failure: string;
            /** When there's no connection to Firebase */
            offline: string;
            /** When the email address couldn't be changed for unknown reasons. */
            unchanged: string;
            /** When account deletion failed */
            delete: string;
            /** When a password is wrong */
            wrongPassword: string;
            /** When there are too mant failed attempts */
            tooMany: string;
        };
        button: {
            /** Log out of the account */
            logout: ButtonText;
            /** Login button description */
            login: string;
            /** Update email button description  */
            updateEmail: string;
            /** Delete account button */
            delete: ButtonText;
            /** Confirm deletion */
            reallyDelete: ButtonText;
            /** Update password */
            updatePassword: string;
        };
        toggle: {
            /** Reveal password toggle */
            reveal: ToggleText;
        };
    };
</script>

<script lang="ts">
    import isValidUsername from '@db/creators/isValidUsername';
    import Header from '../../components/app/Header.svelte';
    import { locales } from '../../db/Database';
    import LoginForm from './LoginForm.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import isValidEmail from '@db/creators/isValidEmail';
    import Button from '@components/widgets/Button.svelte';
    import { analytics, auth, functions } from '@db/firebase';
    import {
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
        signInWithEmailAndPassword,
        signInWithEmailLink,
    } from 'firebase/auth';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { FirebaseError } from 'firebase/app';
    import getAuthErrorDescription from './getAuthErrorDescription';
    import Spinning from '@components/app/Spinning.svelte';
    import isValidPassword from './IsValidPassword';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import { logEvent } from 'firebase/analytics';
    import Note from '@components/widgets/Note.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import { emailAccountExists } from '../../db/creators/accountExists';

    /** The username typed into the text field */
    let username = $state('');
    let password = $state('');
    let email = $state('');

    /** When true, login submission button shows loading spinner */
    let loading = $state(false);

    /** Feedback to show in the login form */
    let usernameFeedback: string | undefined = $state(undefined);
    let emailFeedback: string | undefined = $state(undefined);

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
            const exists = await emailAccountExists(email);

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

<MarkupHtmlView markup={$locales.get((l) => l.ui.page.login.prompt.login)} />

<LoginForm submit={usernameSignin} feedback={usernameFeedback}>
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

<MarkupHtmlView markup={$locales.get((l) => l.ui.page.login.prompt.join)} />

<hr />

<MarkupHtmlView
    note
    markup={$locales.get((l) => l.ui.page.login.prompt.forgot)}
/>

<hr />

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
        margin-bottom: 1em;
    }
</style>
