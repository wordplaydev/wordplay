<script lang="ts">
    import {
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
    } from 'firebase/auth';
    import CreatorDatabase from '@db/CreatorDatabase';
    import validEmail from '@db/validEmail';
    import Subheader from '@components/app/Subheader.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import Button from '@components/widgets/Button.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import LoginForm from './LoginForm.svelte';
    import { FirebaseError } from 'firebase/app';
    import { auth } from '@db/firebase';
    import getLoginErrorDescription from './getAuthErrorDescription';

    /** The username text currently in the text field */
    let username = '';
    /** Feedback to provide about the login attempt */
    let usernameLoginFeedback: string | undefined = undefined;
    /** The password currently in the password text field */
    let password = '';
    /** The repeated password currently in the password text field */
    let password2 = '';
    /** Whether a sign in has been attempted */
    let submitted = false;
    /** True if the creator tried to log in and there's no account yet. */
    let noAccount = false;

    /** True if the username and password is valid */
    $: loginFormSubmittable =
        isValidUsername(username) && isValidPassword(password);
    $: usernameIsCheckable = !noAccount && loginFormSubmittable;
    $: usernameIsCreatable =
        noAccount &&
        isValidUsername(username) &&
        isValidPassword(password) &&
        isValidPassword(password2) &&
        password === password2;

    /** The email to submit to Firebase given the current username (since Firebase doesn't support usernames) */
    $: emailUsername = CreatorDatabase.getUsernameEmail(username);

    function isValidUsername(username: string) {
        return !validEmail(username) && username.length >= 5;
    }

    function isValidPassword(pass: string) {
        return pass.length >= 10;
    }

    async function tryUsernameLogin() {
        if (auth && usernameIsCheckable) {
            try {
                await signInWithEmailAndPassword(auth, emailUsername, password);
                submitted = true;
            } catch (error) {
                if (
                    error instanceof FirebaseError &&
                    error.code === 'auth/user-not-found'
                ) {
                    noAccount = true;
                } else {
                    usernameLoginFeedback = getLoginErrorDescription(
                        $locales,
                        error
                    );
                }
            } finally {
                submitted = false;
            }
        }
    }

    async function createUsernameLogin() {
        if (auth && usernameIsCreatable) {
            try {
                submitted = true;
                await createUserWithEmailAndPassword(
                    auth,
                    emailUsername,
                    password
                );
            } catch (error) {
                usernameLoginFeedback = getLoginErrorDescription(
                    $locales,
                    error
                );
                submitted = false;
            }
        }
    }
</script>

<LoginForm
    submit={noAccount ? createUsernameLogin : tryUsernameLogin}
    feedback={usernameLoginFeedback}
>
    <Subheader
        >{$locales.get((l) => l.ui.page.login.subheader.username)}</Subheader
    >
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.login.prompt.usernamereminder)}
    />
    <p>
        <TextField
            description={$locales.get(
                (l) => l.ui.page.login.field.username.description
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.username.placeholder
            )}
            bind:text={username}
            editable={!submitted}
            validator={(name) => isValidUsername(name)}
        />
        <TextField
            kind={'password'}
            description={$locales.get(
                (l) => l.ui.page.login.field.password.description
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.password.placeholder
            )}
            bind:text={password}
            validator={(pass) => isValidPassword(pass)}
        />
        {#if noAccount}
            <TextField
                kind={'password'}
                description={$locales.get(
                    (l) => l.ui.page.login.field.password.description
                )}
                placeholder={$locales.get(
                    (l) => l.ui.page.login.field.password.placeholder
                )}
                bind:text={password2}
                editable={!submitted}
                validator={(pass) => pass === password && isValidPassword(pass)}
            />
        {/if}

        <Button
            submit
            background
            tip={$locales.get((l) => l.ui.page.login.button.login)}
            active={!submitted && (usernameIsCheckable || usernameIsCreatable)}
            action={() => undefined}
            >{#if noAccount}&gt;&gt;{:else}&gt;{/if}</Button
        >
    </p>
    {#if noAccount && password2 !== password}
        <Feedback
            >{$locales.get(
                (l) => l.ui.page.login.prompt.passwordreminder
            )}</Feedback
        >
    {:else if !noAccount && !isValidUsername(username)}
        <Feedback
            >{$locales.get(
                (l) => l.ui.page.login.prompt.usernamerule
            )}</Feedback
        >
    {:else if !noAccount && password.length > 0 && !isValidPassword(password)}
        <Feedback
            >{$locales.get(
                (l) => l.ui.page.login.prompt.passwordrule
            )}</Feedback
        >
    {/if}
</LoginForm>
