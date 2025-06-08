<script lang="ts">
    import { goto } from '$app/navigation';
    import Action from '@components/app/Action.svelte';
    import CreatorCharacterView from '@components/app/CreatorCharacterView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { updateProfile, type User } from 'firebase/auth';
    import Header from '../../components/app/Header.svelte';
    import Link from '../../components/app/Link.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
    import ConfirmButton from '../../components/widgets/ConfirmButton.svelte';
    import EmojiChooser from '../../components/widgets/EmojiChooser.svelte';
    import { Creator } from '../../db/creators/CreatorDatabase';
    import { SaveStatus, status } from '../../db/Database';
    import { auth } from '../../db/firebase';
    import { isModerator } from '../../db/projects/Moderation';
    import ChangeEmail from './ChangeEmail.svelte';
    import ChangePassword from './ChangePassword.svelte';
    import DeleteAccount from './DeleteAccount.svelte';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let creator = $derived(Creator.from(user));

    let moderator = $state(false);

    // When the user changes, check if they're a moderator.
    $effect(() => {
        isModerator(user).then((mod) => (moderator = mod));
    });

    function rename(name: string) {
        // This should trigger an update to the user store, and therefore this view.
        updateProfile(user, {
            displayName: name,
        }).then(() => user.reload());
    }

    async function logout() {
        // Then sign out. (Projects will be deleted locally by the project database when user updates.)
        if (auth) {
            await auth.signOut();
            goto('/login');
        }
    }
</script>

<Header wrap
    ><span class="emoji"
        ><CreatorCharacterView character={user.displayName}
        ></CreatorCharacterView></span
    >{creator.getUsername(false)}</Header
>

<div class="actions">
    <Action>
        <LocalizedText path={(l) => l.ui.page.login.prompt.play} />
        <Link to="/projects" label={(l) => l.ui.page.projects.header} />
        <Link to="/characters" label={(l) => l.ui.page.characters.header} />
        <Link to="/teach" label={(l) => l.ui.page.teach.header} />
    </Action>
    <Action>
        <LocalizedText path={(l) => l.ui.page.login.prompt.name} />
        <EmojiChooser
            pick={(name) => rename(name)}
            emoji={user.displayName ?? ''}
        />
    </Action>
    <Action>
        <MarkupHTMLView markup={(l) => l.ui.page.login.prompt.logout} />
        <ConfirmButton
            background
            tip={(l) => l.ui.page.login.button.logout.tip}
            action={logout}
            enabled={$status.status === SaveStatus.Saved}
            prompt={(l) => l.ui.page.login.button.logout.label}
            label={(l) => l.ui.page.login.button.logout.label}
        />
    </Action>
    {#if !creator.isUsername()}
        <Action>
            <ChangeEmail {user} />
        </Action>
    {:else}
        <Action>
            <ChangePassword {user} />
        </Action>
    {/if}
    <Action><DeleteAccount {user} /></Action>
    {#if moderator}
        <Action>
            <span
                >You're a moderator. Go <Link to="/moderate">moderate</Link
                >?</span
            >
        </Action>
    {/if}
</div>

<style>
    .actions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .emoji {
        display: inline-block;
        font-family: 'Noto Color Emoji';
    }
</style>
