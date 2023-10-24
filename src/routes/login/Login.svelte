<script lang="ts">
    import {
        createUserWithEmailAndPassword,
        isSignInWithEmailLink,
        sendSignInLinkToEmail,
        signInWithEmailAndPassword,
    } from 'firebase/auth';
    import Header from '../../components/app/Header.svelte';
    import TextField from '../../components/widgets/TextField.svelte';
    import { locales } from '../../db/Database';
    import { getUser } from '../../components/project/Contexts';
    import { analytics, auth } from '../../db/firebase';
    import Button from '../../components/widgets/Button.svelte';
    import validEmail from '../../db/validEmail';
    import Feedback from '../../components/app/Feedback.svelte';
    import { onMount } from 'svelte';
    import { signInWithEmailLink } from 'firebase/auth';
    import { logEvent } from 'firebase/analytics';
    import { FirebaseError } from 'firebase/app';
    import { getLoginErrorDescription } from './login';
    import { goto } from '$app/navigation';
    import Mode from '../../components/widgets/Mode.svelte';
    import Subheader from '../../components/app/Subheader.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import Note from '../../components/widgets/Note.svelte';
    import { HiddenUsernameEmailDomain } from '../../db/Creator';

    let user = getUser();
    let success: boolean | undefined = undefined;

    let missingEmail = false;
    let email: string;
    let sent = false;
    let loginFeedback = '';
    let younger = true;
    let username = '';
    let password = '';

    $: emailSubmittable = !sent && validEmail(email);

    $: usernameSubmittable =
        !sent && isValidUsername(username) && isValidPassword(password);

    function isValidUsername(username: string) {
        return !validEmail(username) && username.length >= 5;
    }

    function isValidPassword(pass: string) {
        return pass.length >= 10;
    }

    async function startEmailLogin() {
        if (auth && emailSubmittable) {
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
                communicateError(err);
            }
        }
    }

    function finishLogin(): string | undefined {
        if (auth) {
            try {
                // If this is on the same device and browser, then the email should be in local storage.
                const storedEmail = window.localStorage.getItem('email');

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
                            // Remove the email we might have stored.
                            window.localStorage.removeItem('email');

                            // Mark success to show feedback.
                            success = true;

                            // Log login event
                            if (analytics) logEvent(analytics, 'login');

                            // Remove the query on the URL so there's no attempt to login on refresh.
                            goto('/login');
                        })
                        .catch((err) => communicateError(err));
                }
            } catch (err) {
                communicateError(err);
            }
        }
        return undefined;
    }

    async function startUsernameLogin() {
        const emailUsername = `${username}${HiddenUsernameEmailDomain}`;
        if (auth && usernameSubmittable) {
            try {
                await signInWithEmailAndPassword(
                    auth,
                    `${username}${HiddenUsernameEmailDomain}`,
                    password
                );
            } catch (error) {
                // If not found, then we create the user.
                if (
                    error instanceof FirebaseError &&
                    error.code === 'auth/user-not-found'
                ) {
                    try {
                        await createUserWithEmailAndPassword(
                            auth,
                            emailUsername,
                            password
                        );
                    } catch (error) {
                        communicateError(error);
                    }
                }
                // Otherwise, communicate the error.
                else communicateError(error);
            }
        }
    }

    function communicateError(err: unknown): string | undefined {
        if (err instanceof FirebaseError) {
            console.error(err.code);
            console.error(err.message);
            loginFeedback =
                getLoginErrorDescription(err.code, $locales) ??
                $locales.get((l) => l.ui.page.login.error.failure);
        } else {
            console.error(err);
            return $locales.get((l) => l.ui.page.login.error.failure);
        }
        success = false;
    }

    // If it's a sign in, finish signing in once authenticated.
    onMount(() => {
        if (auth && isSignInWithEmailLink(auth, window.location.href))
            finishLogin();
    });
</script>

<Header>{$locales.get((l) => l.ui.page.login.header)}</Header>
<p>
    {#if missingEmail}
        {$locales.get((l) => l.ui.page.login.prompt.enter)}
    {:else if $user === null}
        {$locales.get((l) => l.ui.page.login.prompt.login)}
    {/if}
</p>

<Mode
    modes={$locales.get((l) => l.ui.page.login.prompt.age.modes)}
    choice={0}
    select={(choice) => (younger = choice === 0)}
    descriptions={$locales.get((l) => l.ui.page.login.prompt.age)}
/>

{#if missingEmail || !younger}
    <Subheader>{$locales.get((l) => l.ui.page.login.subheader.email)}</Subheader
    >
    <form class="login-form" on:submit={startEmailLogin}>
        <Note
            ><MarkupHtmlView
                inline
                markup={$locales.get((l) => l.ui.page.login.prompt.emailrules)}
            /></Note
        >
        <div>
            <TextField
                kind="email"
                description={$locales.get(
                    (l) => l.ui.page.login.field.email.description
                )}
                placeholder={$locales.get(
                    (l) => l.ui.page.login.field.email.placeholder
                )}
                bind:text={email}
                editable={!sent}
            />
            <Button
                submit
                background
                tip={$locales.get((l) => l.ui.page.login.button.login)}
                active={emailSubmittable}
                action={() => undefined}>&gt;</Button
            >
        </div>
    </form>
{/if}
<Subheader>{$locales.get((l) => l.ui.page.login.subheader.username)}</Subheader>
<form class="login-form" on:submit={startUsernameLogin}>
    <TextField
        description={$locales.get(
            (l) => l.ui.page.login.field.username.description
        )}
        placeholder={$locales.get(
            (l) => l.ui.page.login.field.username.placeholder
        )}
        bind:text={username}
        editable={!sent}
        validator={(name) => isValidUsername(name)}
    />
    <div>
        <TextField
            kind="password"
            description={$locales.get(
                (l) => l.ui.page.login.field.password.description
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.password.placeholder
            )}
            bind:text={password}
            editable={!sent}
            validator={(pass) => isValidPassword(pass)}
        />
        <Button
            submit
            background
            tip={$locales.get((l) => l.ui.page.login.button.login)}
            active={usernameSubmittable}
            action={() => undefined}>&gt;</Button
        ></div
    >
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.login.prompt.usernamerules)}
    />
</form>

{#if sent === true}
    <Feedback>{$locales.get((l) => l.ui.page.login.prompt.sent)}</Feedback>
{:else if success === true}
    <Feedback>{$locales.get((l) => l.ui.page.login.prompt.success)}</Feedback>
{:else if success === false}
    <Feedback>{loginFeedback}</Feedback>
{/if}

<style>
    .login-form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: 1em;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
    }
</style>
