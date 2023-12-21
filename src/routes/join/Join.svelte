<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import LoginForm from '../login/LoginForm.svelte';
    import { locales } from '@db/Database';
    import isValidPassword from '../login/IsValidPassword';
    import { createUserWithEmailAndPassword } from 'firebase/auth';
    import { auth, functions } from '@db/firebase';
    import getAuthErrorDescription from '../login/getAuthErrorDescription';
    import { Creator } from '@db/CreatorDatabase';
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Header from '@components/app/Header.svelte';
    import isValidUsername from '@db/isValidUsername';
    import { goto } from '$app/navigation';
    import { httpsCallable } from 'firebase/functions';
    import Feedback from '@components/app/Feedback.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';

    let username = '';
    let password = '';
    let password2 = '';
    let available: undefined | boolean = undefined;
    let reveal = false;

    /** When true, login submission button shows loading spinner */
    let loading = false;

    /** Feedback to show in the login form */
    let feedback: string | undefined = undefined;

    function createAccountFormComplete() {
        return (
            isValidUsername(username) &&
            isValidPassword(password) &&
            password === password2
        );
    }

    async function createAccount() {
        if (auth && functions && createAccountFormComplete()) {
            try {
                loading = true;

                // Create a fake Wordplay email from the username, since Firefox doesn't support username accounts.
                // We store the email has in the database.
                const wordplayEmail = Creator.usernameEmail(username);

                // Create the account in Firebase Auth.
                await createUserWithEmailAndPassword(
                    auth,
                    wordplayEmail,
                    password,
                );

                // If successful, navigate to the login page to show the profile.
                goto('/profile');
            } catch (error) {
                feedback = getAuthErrorDescription($locales, error);
            } finally {
                loading = false;
            }
        }
    }

    async function checkUsername(name: string) {
        if (functions === undefined) return;
        const wordplayEmail = Creator.usernameEmail(name);

        // Get missing info.
        const emailExists = httpsCallable<string>(functions, 'emailExists');
        available = (await emailExists(wordplayEmail)).data === false;
    }
</script>

<Header>{$locales.get((l) => l.ui.page.join.header)}</Header>

<LoginForm submit={createAccount} {feedback}>
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.join.prompt.username)}
    />

    <p class="center">
        <TextField
            description={$locales.get(
                (l) => l.ui.page.login.field.username.description,
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.username.placeholder,
            )}
            bind:text={username}
            editable={!loading}
            validator={(text) => isValidUsername(text)}
            done={(text) => checkUsername(text)}
        />
    </p>
    {#if available === false}
        <Feedback>This username is taken.</Feedback>
    {/if}

    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.join.prompt.password)}
    />
    <p class="center">
        <TextField
            kind={reveal ? undefined : 'password'}
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
        <TextField
            kind={reveal ? undefined : 'password'}
            description={$locales.get(
                (l) => l.ui.page.login.field.password.description,
            )}
            placeholder={$locales.get(
                (l) => l.ui.page.login.field.password.placeholder,
            )}
            bind:text={password2}
            editable={!loading}
            validator={(pass) => pass === password && isValidPassword(pass)}
        />
        <Toggle
            tips={$locales.get((l) => l.ui.page.login.toggle.reveal)}
            on={reveal}
            toggle={() => (reveal = !reveal)}>🔎</Toggle
        >
    </p>

    <p class="center">
        {#if loading}
            <Spinning></Spinning>
        {:else}
            <Button
                background
                submit
                tip={$locales.get((l) => l.ui.page.login.button.login)}
                active={isValidUsername(username) &&
                    isValidPassword(password) &&
                    password === password2}
                action={() => undefined}
                >{$locales.get((l) => l.ui.page.join.header)}</Button
            >
        {/if}
    </p>
</LoginForm>

<style>
    .center {
        text-align: center;
    }
</style>
