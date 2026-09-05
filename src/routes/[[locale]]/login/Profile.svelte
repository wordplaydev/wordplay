<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import CreatorCharacterView from '@components/app/CreatorCharacterView.svelte';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import EmojiChooser from '@components/widgets/GlyphChooser.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { getUsername } from '@db/creators/handle.svelte';
    import { DB } from '@db/Database';
    import { localeGoto } from '@util/localeGoto';
    import { updateProfile, type User } from 'firebase/auth';
    import ChangeEmail from './ChangeEmail.svelte';
    import ChangePassword from './ChangePassword.svelte';
    import SigninMethod from './SigninMethod.svelte';
    import Username from './Username.svelte';
    import DeleteAccount from './DeleteAccount.svelte';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    // Pass the handle: Creator.from otherwise derives the name from the auth
    // address, which a rename deliberately leaves alone — so the header would
    // keep showing the old name while everyone else saw the new one.
    let creator = $derived(Creator.from(user, getUsername(user)));

    // Items (across every domain) with edits not yet saved online. Logout wipes
    // the local cache, so it discards them; warn when there are any, but never
    // block, since a save that keeps failing would trap someone signed in.
    let unsaved = $derived(DB.getUnsavedCount());

    /** Writable holding the current Firebase user. We need a handle on the
     *  store (not just the unwrapped value via props) so we can republish
     *  after Firebase mutates the user in place — see `rename`. */
    const userStore = getUser();

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
        // Deliberate sign-out: clear local data for privacy, then sign out.
        // The wipe happens here (not on every auth-null) so an involuntary auth
        // drop from a flaky connection doesn't erase local projects — see
        // Database.logout / updateUser.
        await DB.logout();
        localeGoto('/login');
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
        {#if unsaved > 0}
            <Notice text={(l) => l.ui.page.login.error.unsaved} />
        {/if}
        <ConfirmButton
            background
            tip={(l) => l.ui.page.login.button.logout.tip}
            action={logout}
            prompt={(l) => l.ui.page.login.button.logout.label}
            label={(l) => l.ui.page.login.button.logout.label}
            testid="logout"
        />
    </Action>
    <!-- What this account uses today, and how to change it. Both are shown,
         because they are different questions: one changes a credential, the
         other changes which credential you have. -->
    {#if Creator.isUsername(user.email ?? '')}
        <Action>
            <ChangePassword {user} />
        </Action>
    {:else}
        <Action>
            <ChangeEmail {user} />
        </Action>
    {/if}
    <Action>
        <Username {user} />
    </Action>
    <Action>
        <SigninMethod {user} />
    </Action>
    <Action><DeleteAccount {user} /></Action>
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
