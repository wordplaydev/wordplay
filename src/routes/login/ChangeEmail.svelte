<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import validEmail from '@db/creators/isValidEmail';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type { User } from 'firebase/auth';
    import { verifyBeforeUpdateEmail } from 'firebase/auth';
    import Feedback from '../../components/app/Notice.svelte';
    import getLoginErrorDescription from './getAuthErrorDescription';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let changeSubmitted = $state(false);
    let changeFeedback: LocaleTextAccessor | undefined = $state(undefined);
    let newEmail: string = $state('');

    async function update() {
        // Enter loading state, try to login and wait for it to complete, and then leave loading state.
        // Give some feedback when loading.
        changeSubmitted = true;
        try {
            await verifyBeforeUpdateEmail(user, newEmail);
            changeFeedback = (l) => l.ui.page.login.prompt.confirm;
        } catch (error) {
            changeFeedback = getLoginErrorDescription(error);
        } finally {
            changeSubmitted = false;
        }
    }
</script>

<p><LocalizedText path={(l) => l.ui.page.login.prompt.changeEmail} /></p>
<form onsubmit={update}>
    <TextField
        id="new-email"
        description={(l) => l.ui.page.login.field.email.description}
        placeholder={(l) => l.ui.page.login.field.email.placeholder}
        bind:text={newEmail}
        editable={!changeSubmitted}
    /><Button
        submit
        background
        tip={(l) => l.ui.page.login.button.updateEmail}
        active={validEmail(newEmail)}
        action={() => undefined}>&gt;</Button
    >
    {#if changeSubmitted}<Spinning
            label={(l) => l.ui.page.login.feedback.changing}
        />
    {:else if changeFeedback}<Feedback inline text={changeFeedback} />{/if}
</form>
