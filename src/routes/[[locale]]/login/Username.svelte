<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { getUsername } from '@db/creators/handle.svelte';
    import { changeUsername, claimUsername } from '@db/creators/signinMethod';
    import { isValidUsername, repairUsername } from '@db/creators/username';
    import { usernameAvailable } from '@db/creators/usernames';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type { User } from 'firebase/auth';

    /**
     * Choosing or changing the name other people see (#628 follow-up).
     *
     * A username used to be immutable, because a character's name embeds it and
     * `@username/Character` is a language token. That was the right default and
     * the wrong permanent answer: it left twenty accounts with a name nothing
     * could reference and no way to fix it, and twenty more — the original
     * accounts, made with a real address before usernames existed — with no
     * name at all, shown to everyone as `—`.
     *
     * Renaming is safe because the old name stays reserved to the same creator
     * rather than being retired, and their characters carry it as an alias. So
     * old references keep resolving and their sign-in is untouched.
     */
    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    const current = $derived(getUsername(user));

    let wanted = $state('');
    let submitting = $state(false);
    let checking = $state(false);
    let available: boolean | undefined = $state(undefined);
    let feedback: LocaleTextAccessor | undefined = $state(undefined);

    /** A cleaned-up form of what they typed, offered when what they typed can't
     *  be claimed — most of the reason a name is refused is a character that is
     *  Wordplay syntax, and showing the nearest name that works is kinder than
     *  explaining the rule. Only when it differs and is actually claimable. */
    const suggestion = $derived.by(() => {
        if (wanted === '' || isValidUsername(wanted)) return undefined;
        const repaired = repairUsername(wanted);
        return repaired !== wanted && isValidUsername(repaired)
            ? repaired
            : undefined;
    });

    const ready = $derived(
        isValidUsername(wanted) &&
            available !== false &&
            wanted !== current &&
            !submitting,
    );

    async function save() {
        if (!ready) return;
        submitting = true;
        feedback = undefined;
        try {
            // Claiming and changing are different operations: one records a
            // name for the first time, the other moves characters and leaves an
            // alias behind.
            const result =
                current === undefined
                    ? await claimUsername(wanted)
                    : await changeUsername(wanted);
            if (result === 'claimed' || result === 'changed') {
                feedback =
                    current === undefined
                        ? (l) => l.ui.page.login.username.claimed
                        : (l) => l.ui.page.login.username.changed;
                wanted = '';
            } else if (result === 'taken') {
                available = false;
                feedback = (l) => l.ui.page.login.error.usernameTaken;
            } else {
                feedback = (l) => l.ui.page.login.error.failure;
            }
        } finally {
            submitting = false;
        }
    }
</script>

{#if current === undefined}
    <MarkupHTMLView markup={(l) => l.ui.page.login.username.missing} />
{:else}
    <MarkupHTMLView markup={(l) => l.ui.page.login.username.change} />
{/if}

<form onsubmit={save}>
    <TextField
        id="username-choice-field"
        description={(l) => l.ui.page.login.username.field.description}
        placeholder={(l) => l.ui.page.login.username.field.placeholder}
        bind:text={wanted}
        editable={!submitting}
        validator={(text) =>
            text === '' || isValidUsername(text)
                ? available === false
                    ? (l) => l.ui.page.login.error.usernameTaken
                    : true
                : (l) => l.ui.page.login.error.invalidUsername}
        changed={() => {
            if (available === false) available = undefined;
        }}
        dwelled={async (text) => {
            if (!isValidUsername(text)) return;
            checking = true;
            // Only a definite "no" marks it taken; an undefined answer means we
            // couldn't ask, and the claim itself will decide.
            available = (await usernameAvailable(text)) !== false;
            checking = false;
        }}
    />
    <Spinning size={1} spin={checking}></Spinning>
    <Button
        submit
        background
        tip={(l) => l.ui.page.login.username.save.tip}
        label={(l) => l.ui.page.login.username.save.label}
        active={ready}
        action={save}
    />
</form>

{#if suggestion}
    <!-- Offering the nearest working name is kinder than explaining which of
         the characters they typed is Wordplay syntax. -->
    <p>
        <Button
            tip={() => suggestion}
            action={() => {
                wanted = suggestion;
                available = undefined;
            }}>{suggestion}</Button
        >
    </p>
{/if}

{#if submitting}
    <Spinning label={(l) => l.ui.page.login.feedback.changing} />
{:else if feedback}
    <Notice inline text={feedback} />
{/if}
