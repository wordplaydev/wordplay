<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import CreatorCharacterView from '@components/app/CreatorCharacterView.svelte';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import EmojiChooser from '@components/widgets/GlyphChooser.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { SaveStatus, status } from '@db/Database';
    import { auth } from '@db/firebase';
    import { isModerator } from '@db/projects/Moderation';
    import { localeGoto } from '@util/localeGoto';
    import { updateProfile, type User } from 'firebase/auth';
    import ChangeEmail from './ChangeEmail.svelte';
    import ChangePassword from './ChangePassword.svelte';
    import DeleteAccount from './DeleteAccount.svelte';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    let creator = $derived(Creator.from(user));

    let moderator = $state(false);

    /** Writable holding the current Firebase user. We need a handle on the
     *  store (not just the unwrapped value via props) so we can republish
     *  after Firebase mutates the user in place — see `rename`. */
    const userStore = getUser();

    // When the user changes, check if they're a moderator.
    $effect(() => {
        isModerator(user).then((mod) => (moderator = mod));
    });

    function rename(name: string) {
        // Firebase mutates `user.displayName` in place on success. The user
        // store still points at the same object, so Svelte never notices the
        // change. Re-set the store with the same reference to fan out the
        // update to subscribers (Profile, Header avatar, etc.).
        updateProfile(user, {
            displayName: name,
        }).then(() => userStore?.set(user));
    }

    async function logout() {
        // Then sign out. (Projects will be deleted locally by the project database when user updates.)
        if (auth) {
            await auth.signOut();
            localeGoto('/login');
        }
    }
</script>

<Header wrap
    ><span class="emoji"
        ><CreatorCharacterView character={user.displayName}
        ></CreatorCharacterView>
    </span>
    <span data-testid="username">{creator.getUsername(false)}</span></Header
>

<div class="actions" data-testid="profile">
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
            glyph={user.displayName ?? ''}
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
            testid="logout"
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
