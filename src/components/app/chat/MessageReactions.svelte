<!--
  The emoji people have put on one message, and the control that opens the
  conversation's reaction picker (#821).

  A pill is a button rather than a toggle, though what it does is a toggle. A
  reaction only ever has one person's press in it, so pressing your own removes
  it — and when you were the only one, the control disappears under your finger,
  which reads as broken rather than as "off". A button whose name says what the
  press will do ("take back your thumbs up, 2 people") is honest about that, and
  says more than a pressed bit would.

  The picker itself is not here: it belongs to the conversation, for the reasons
  in ReactionPicker.
-->
<script lang="ts">
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import EmojisRepaired from '@components/widgets/EmojisRepaired.svelte';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { SerializedMessage } from '@db/chats/ChatDatabase.svelte';
    import { locales } from '@db/Database';
    import { withDefaultColorEmoji } from '@unicode/emoji';

    interface Props {
        chat: Chat;
        message: SerializedMessage;
        /** What to call an emoji, in the reader's language. Passed down so the
         *  emoji names are fetched once for the conversation rather than once
         *  per message. */
        nameOf: (emoji: string) => string;
        /** Add or take back this reader's reaction. The conversation owns it so
         *  a pill and the shared picker announce the same way. */
        react: (emoji: string, on: boolean) => void;
        /** Whether this message's picker is the one showing. */
        picking: boolean;
        /** Ask the conversation to open its picker against this control. */
        open: (anchor: HTMLElement) => void;
        close: () => void;
        /** The id of the picker panel, for the disclosure's `aria-controls`. */
        pickerID: string;
    }

    let {
        chat,
        message,
        nameOf,
        react,
        picking,
        open,
        close,
        pickerID,
    }: Props = $props();

    const user = getUser();

    let adder = $state<HTMLButtonElement | undefined>(undefined);

    let eligible = $derived(
        isAuthenticated($user) && chat.isEligible($user.uid),
    );

    /** Emoji in a stable order, so a reaction doesn't jump as counts change. */
    let reactions = $derived(
        Object.entries(message.reactions ?? {}).sort(([a], [b]) =>
            a.localeCompare(b),
        ),
    );
</script>

<div class="reactions">
    {#each reactions as [emoji, who] (emoji)}
        {@const mine = isAuthenticated($user) && who.includes($user.uid)}
        <Button
            tip={() =>
                $locales
                    .concretize(
                        mine
                            ? (l) => l.ui.collaborate.reaction.take
                            : (l) => l.ui.collaborate.reaction.give,
                        { emoji: nameOf(emoji) || emoji, count: who.length },
                    )
                    .toText()}
            active={eligible}
            classes={mine ? 'reaction mine' : 'reaction'}
            action={() => react(emoji, !mine)}
            ><EmojisRepaired text={withDefaultColorEmoji(emoji)} /><span
                class="count">{who.length}</span
            ></Button
        >
    {/each}
    {#if eligible}
        <!-- The one control that opens the conversation's picker. It shows ×
             while open, since a + that stays a + gives no sign that pressing it
             again is what closes the panel. -->
        <Button
            bind:view={adder}
            tip={picking
                ? (l) => l.ui.collaborate.reaction.close
                : (l) => l.ui.collaborate.reaction.add}
            expanded={picking}
            controls={pickerID}
            action={() => {
                if (picking) close();
                else if (adder) open(adder);
            }}
            icon={picking ? '✕' : '+'}
        ></Button>
    {/if}
</div>

<style>
    .reactions {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
    }

    /* A pill: the emoji and how many people chose it, close enough together to
       read as one thing. */
    .reactions :global(button.reaction) {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 4);
        padding: 0 calc(var(--wordplay-spacing) / 2);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
    }

    /* Yours, marked by the border rather than by a pressed look, which is what
       made it read as a toggle. */
    .reactions :global(button.reaction.mine) {
        border-color: var(--wordplay-highlight-color);
    }

    .count {
        font-size: var(--wordplay-small-font-size);
    }
</style>
