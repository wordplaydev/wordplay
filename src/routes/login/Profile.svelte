<script lang="ts">
    import { updateProfile, type User } from 'firebase/auth';
    import Header from '../../components/app/Header.svelte';
    import { locales, SaveStatus } from '../../db/Database';
    import Link from '../../components/app/Link.svelte';
    import EmojiChooser from '../../components/widgets/EmojiChooser.svelte';
    import { auth } from '../../db/firebase';
    import { isModerator } from '../../models/Moderation';
    import { Creator } from '../../db/CreatorDatabase';
    import ConfirmButton from '../../components/widgets/ConfirmButton.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { status } from '../../db/Database';
    import ChangeEmail from './ChangeEmail.svelte';
    import ChangePassword from './ChangePassword.svelte';
    import DeleteAccount from './DeleteAccount.svelte';
    import { goto } from '$app/navigation';

    export let user: User;

    $: creator = Creator.from(user);

    let moderator = false;
    $: isModerator(user).then((mod) => (moderator = mod));

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
    ><span class="emoji">{user.displayName ?? '😃'}</span>
    {creator.getUsername(false)}</Header
>

<div class="actions">
    <div class="action">
        <p>{$locales.get((l) => l.ui.page.login.prompt.play)}</p>
        <p
            ><Link to="/projects"
                >{$locales.get((l) => l.ui.page.projects.header)}</Link
            ></p
        >
    </div>
    <div class="action">
        <p>{$locales.get((l) => l.ui.page.login.prompt.name)}</p>
        <EmojiChooser
            pick={(name) => rename(name)}
            emoji={user.displayName ?? ''}
        />
    </div>
    <div class="action">
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.login.prompt.logout)}
        />
        <p
            ><ConfirmButton
                background
                tip={$locales.get((l) => l.ui.page.login.button.logout.tip)}
                action={logout}
                enabled={$status.status === SaveStatus.Saved}
                prompt={`🗑️ ${$locales.get(
                    (l) => l.ui.page.login.button.logout.label,
                )}`}
                >{$locales.get(
                    (l) => l.ui.page.login.button.logout.label,
                )}…</ConfirmButton
            ></p
        >
    </div>
    {#if !creator.isUsername()}
        <div class="action">
            <ChangeEmail {user} />
        </div>
    {:else}
        <div class="action">
            <ChangePassword {user} />
        </div>
    {/if}
    <div class="action"><DeleteAccount {user} /></div>
    {#if moderator}
        <div class="action">
            You're a moderator. Go <Link to="/moderate">moderate</Link>?
        </div>
    {/if}
</div>

<style>
    .actions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .action {
        min-width: 15em;
        width: calc(50% - var(--wordplay-spacing));
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .emoji {
        display: inline-block;
        font-family: 'Noto Color Emoji';
    }
</style>
