<script lang="ts">
    import Action from '@components/app/Action.svelte';
    import CreatorCharacterView from '@components/app/CreatorCharacterView.svelte';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import { getUser } from '@components/project/Contexts';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import EmojiChooser from '@components/widgets/GlyphChooser.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { getUsername } from '@db/creators/handle.svelte';
    import { DB } from '@db/Database';
    import { localeGoto } from '@util/localeGoto';
    import { updateProfile, type User } from 'firebase/auth';
    import ChangeEmail from './ChangeEmail.svelte';
    import ChangePassword from './ChangePassword.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import EmailNotifications from './EmailNotifications.svelte';
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
        <Subheader text={(l) => l.ui.page.login.subheader.work} />
        <LocalizedText path={(l) => l.ui.page.login.prompt.play} />
        <Link to="/projects" label={(l) => l.ui.page.projects.header} />
        <Link to="/characters" label={(l) => l.ui.page.characters.header} />
        <Link to="/teach" label={(l) => l.ui.page.teach.header} />
    </Action>
    <Action>
        <Subheader text={(l) => l.ui.page.login.subheader.character} />
        <LocalizedText path={(l) => l.ui.page.login.prompt.name} />
        <EmojiChooser
            pick={(name) => rename(name)}
            glyph={user.displayName ?? ''}
        />
    </Action>
    <Action>
        <Subheader text={(l) => l.ui.page.login.subheader.username} />
        <Username {user} />
    </Action>
    <!-- Password and email are exclusive: a username account has no address to
         change, and an email account has no password. So they are two sections
         rather than one, and only one of them is ever here. -->
    {#if Creator.isUsername(user.email ?? '')}
        <Action>
            <Subheader text={(l) => l.ui.page.login.subheader.password} />
            <ChangePassword {user} />
        </Action>
    {/if}
    <!-- Everything about the address in one place: whether there is one, how to
         get or drop one, and what we send to it. Split across blocks, the copy
         had to point at a neighbour — and in a wrapping row, "below" depends on
         how wide the window is. -->
    <Action>
        <Subheader text={(l) => l.ui.page.login.subheader.email} />
        <!-- Three parts in one card, so each needs to read as a part. Without
             the wrappers they are a flat run of paragraphs and forms, and a
             form carries no bottom margin where a paragraph carries 1.5em — so
             a field ended up flush against the next part's first sentence. -->
        {#if !Creator.isUsername(user.email ?? '')}
            <div class="part"><ChangeEmail {user} /></div>
        {/if}
        <div class="part"><SigninMethod {user} /></div>
        <div class="part"><EmailNotifications {user} /></div>
    </Action>
    <Action>
        <Subheader text={(l) => l.ui.page.login.subheader.logout} />
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
    <Action>
        <Subheader text={(l) => l.ui.page.login.subheader.delete} />
        <DeleteAccount {user} />
    </Action>
</div>

<style>
    .actions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        /* Each card is as tall as what it holds. Stretching them to match the
           tallest in the row made short ones — the three links, the logout
           button — into mostly empty boxes beside the character picker, which
           is several hundred pixels of emoji. */
        align-items: start;
    }

    .part {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    /* Separation between the parts, on top of the card's own gap. */
    .part + .part {
        margin-block-start: var(--wordplay-spacing);
    }

    .emoji {
        display: inline-block;
        font-family: 'Noto Color Emoji';
    }
</style>
