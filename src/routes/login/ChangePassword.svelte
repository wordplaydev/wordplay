<script lang="ts">
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import {
        signInWithEmailAndPassword,
        updatePassword,
        type User,
    } from 'firebase/auth';
    import isValidPassword from './IsValidPassword';
    import { FirebaseError } from 'firebase/app';
    import getLoginErrorDescription from './getAuthErrorDescription';
    import Button from '@components/widgets/Button.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { auth } from '@db/firebase';

    export let user: User;

    let currentpassword = '';
    let password1 = '';
    let password2 = '';
    let submitted = false;
    let feedback: string | undefined = undefined;
    let reveal = false;

    async function update() {
        if (auth === undefined || user === null || user.email === null) return;

        try {
            // First, make sure the password is current.
            await signInWithEmailAndPassword(auth, user.email, currentpassword);

            // Then, if the new password and confirmed password match, update the password.
            if (isValidPassword(password2) && password1 === password2) {
                try {
                    submitted = true;
                    await updatePassword(user, password2);
                } catch (error) {
                    if (error instanceof FirebaseError) {
                        feedback = getLoginErrorDescription($locales, error);
                    }
                } finally {
                    submitted = false;
                    feedback = $locales.get(
                        (l) => l.ui.page.login.feedback.updatedPassword,
                    );
                    currentpassword = '';
                    password1 = '';
                    password2 = '';
                }
            }
        } catch (error) {
            feedback = $locales.get((l) => l.ui.page.login.error.wrongPassword);
        }
    }
</script>

<p>{$locales.get((l) => l.ui.page.login.prompt.changePassword)}</p>

<form on:submit={update}>
    <TextField
        kind={reveal ? undefined : 'password'}
        description={$locales.get(
            (l) => l.ui.page.login.field.currentPassword.description,
        )}
        placeholder={$locales.get(
            (l) => l.ui.page.login.field.currentPassword.placeholder,
        )}
        bind:text={currentpassword}
        editable={!submitted}
        validator={(pass) => isValidPassword(pass)}
    />
    <TextField
        kind={reveal ? undefined : 'password'}
        description={$locales.get(
            (l) => l.ui.page.login.field.newPassword.description,
        )}
        placeholder={$locales.get(
            (l) => l.ui.page.login.field.newPassword.placeholder,
        )}
        bind:text={password1}
        editable={!submitted}
        validator={(pass) => isValidPassword(pass)}
    />
    <TextField
        kind={reveal ? undefined : 'password'}
        description={$locales.get(
            (l) => l.ui.page.login.field.newPassword.description,
        )}
        placeholder={$locales.get(
            (l) => l.ui.page.login.field.newPassword.placeholder,
        )}
        bind:text={password2}
        editable={!submitted}
        validator={(pass) => pass === password1 && isValidPassword(pass)}
    />
    <Toggle
        tips={$locales.get((l) => l.ui.page.login.toggle.reveal)}
        on={reveal}
        toggle={() => (reveal = !reveal)}>🔎</Toggle
    >
    <Button
        submit
        background
        tip={$locales.get((l) => l.ui.page.login.button.updatePassword)}
        active={!submitted && isValidPassword(password2)}
        action={() => undefined}>&gt;</Button
    >
    {#if password2.length > 0 && !isValidPassword(password2)}
        <Feedback
            >{$locales.get(
                (l) => l.ui.page.login.prompt.passwordrule,
            )}</Feedback
        >
    {:else if feedback}
        <Feedback>{feedback}</Feedback>
    {/if}
</form>

<style>
    form {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }
</style>
