<!-- Finds a creator by email or username and hands their uid to whoever asked.

     Extracted from CreatorList so the collaborate tile's table of people can
     use the same lookup and the same validation rather than a second copy of
     them. The `id` is required because more than one of these can be on screen
     at once — the gallery page has two — and a shared DOM id breaks the label
     and error associations for both. -->
<script lang="ts">
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { DB } from '@db/Database';
    import validEmail from '@db/creators/isValidEmail';
    import isValidUsername from '@db/creators/isValidUsername';
    import type LocaleText from '@locale/LocaleText';
    import type { Snippet } from 'svelte';

    interface Props {
        /** Unique among every AddCreator on the page. */
        id: string;
        add: (uid: string, emailOrUsername: string) => void;
        /** Rendered between the field and the submit button, for anything else
         *  the caller needs to know before adding — the collaborate tile puts
         *  the privilege picker here. */
        extra?: Snippet | undefined;
        /** The same content as `extra`, but rendering its own `<td>`s, for
         *  the cells layout. Two snippets rather than one because the same
         *  control has to be bare in a form and wrapped in a row. */
        extraCells?: Snippet | undefined;
        /** Render as table cells rather than a form of its own, for a caller
         *  whose add row is the next row of a table. The caller supplies the
         *  `<form>` — one may wrap a `<table>` but not a `<tr>` — and Enter
         *  still submits, since implicit submission clicks the first submit
         *  button whichever cell it is in. */
        cells?: boolean;
    }

    let { id, add, extra, extraCells, cells = false }: Props = $props();

    let adding = $state(false);
    let emailOrUsername = $state('');
    let unknown = $state(false);

    function valid(emailOrUsername: string) {
        // An empty field is not yet wrong. Saying it is meant that merely
        // focusing the field answered you with an error before you had typed
        // anything — and in a table that message is a block hanging below the
        // last row, where a capped region clips it.
        if (emailOrUsername.trim() === '') return true;
        if (!validEmail(emailOrUsername) && !isValidUsername(emailOrUsername)) {
            return (l: LocaleText) => l.ui.page.login.error.invalidUsername;
        }
        // Don't add self
        if (emailOrUsername === Creator.getUsername(DB.getUserEmail() ?? ''))
            return (l: LocaleText) => l.ui.dialog.share.error.self;
        // "We don't know this creator" is a reason what you typed can't be
        // used, exactly like the two rules above, and belongs where they are
        // said: floating under the field. As a block of its own it pushed the
        // row it was in and could be clipped by the tile. Read here rather than
        // passed in, so the field's own validation and the lookup's answer are
        // one message rather than two competing ones.
        if (unknown) return (l: LocaleText) => l.ui.dialog.share.error.unknown;
        return true;
    }

    async function addCreator() {
        if (emailOrUsername.trim() !== '' && valid(emailOrUsername) === true) {
            adding = true;
            const userID = await DB.Creators.getUID(emailOrUsername);
            adding = false;
            if (userID === null) {
                unknown = true;
            } else {
                unknown = false;
                add(userID, emailOrUsername);
                emailOrUsername = '';
            }
        }
    }

    // Any edit is a new attempt, so the last lookup's answer stops applying —
    // including clearing the field, which the previous truthiness check left
    // showing an error about text that was no longer there.
    $effect(() => {
        void emailOrUsername;
        unknown = false;
    });
</script>

{#snippet field()}
    <TextField
        {id}
        bind:text={emailOrUsername}
        placeholder={(l) => l.ui.dialog.share.field.emailOrUsername.placeholder}
        description={(l) => l.ui.dialog.share.field.emailOrUsername.description}
        validator={valid}
    />
{/snippet}

{#snippet submit()}
    <Button
        submit
        background
        tip={(l) => l.ui.dialog.share.button.submit}
        active={emailOrUsername.trim() !== '' &&
            valid(emailOrUsername) === true}
        action={addCreator}>&gt;</Button
    >
    {#if adding}<Spinning />{/if}
{/snippet}

{#if cells}
    <td>{@render field()}</td>
    {@render extraCells?.()}
    <td>{@render submit()}</td>
{:else}
    <form class="form" onsubmit={addCreator}>
        {@render field()}
        {@render extra?.()}
        {@render submit()}
    </form>
{/if}

<style>
    .form {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
    }
</style>
