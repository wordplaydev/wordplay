<!--
  The panel that adds a reaction to a message (#821).

  Eight reactions are offered directly, because reacting is meant to be one
  press — a way to say "read it" cheaply — and a search field is not that.
  Anything else is a press further, through the app's own glyph chooser, which
  already knows every emoji's name in every language Wordplay speaks and is what
  the character and profile pickers use. A curated row alone would be arbitrary
  in an app whose whole language is emoji.

  **One of these for the whole conversation**, not one per message, and this is
  load-bearing rather than tidiness. `Dialog` renders its children whether or
  not it is showing, so a picker per message meant a whole `GlyphChooser` per
  message — each one scanning the entire codepoint table three times and
  building a couple of hundred components — and opening or closing a thread
  rebuilt all of them in one synchronous task. A conversation of a dozen
  messages took about a second to do anything. The chooser is now also behind an
  `{#if}`, so it is built the first time somebody asks for it and never
  otherwise.

  Fixed rather than absolute, and placed with the same helper `Hint` and `Tour`
  use: the messages live in a scroller with `overflow`, which would clip a panel
  positioned inside it.
-->
<script module lang="ts">
    /** The reactions offered without a search.
     *
     *  Deliberately not localized and deliberately not configurable: an emoji
     *  is the same mark to everyone, and this is a shortlist, not a
     *  vocabulary — the chooser behind "more" is the vocabulary. Chosen to
     *  cover what the co-design asked for: acknowledging you have read
     *  something, agreeing, celebrating, being confused, and asking to look. */
    export const CommonReactions = [
        '👍',
        '❤',
        '😀',
        '🎉',
        '🤔',
        '👀',
        '✅',
        '❓',
    ];
</script>

<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import EmojisRepaired from '@components/widgets/EmojisRepaired.svelte';
    import GlyphChooser from '@components/widgets/GlyphChooser.svelte';
    import { placeNearTarget } from '@components/widgets/placeNearTarget';
    import { locales } from '@db/Database';
    import { withDefaultColorEmoji } from '@unicode/emoji';

    interface Props {
        /** The control the panel is anchored to, or undefined when nothing has
         *  asked for it. Doubles as the open flag, since a panel with nothing to
         *  point at has nowhere to be. */
        anchor: HTMLElement | undefined;
        /** The id the anchor's `aria-controls` names. */
        id: string;
        /** What to call an emoji, in the reader's language. Passed in rather
         *  than looked up here so the emoji names are loaded once per
         *  conversation instead of once per control. */
        nameOf: (emoji: string) => string;
        pick: (emoji: string) => void;
        close: () => void;
    }

    let { anchor, id, nameOf, pick, close }: Props = $props();

    let more = $state(false);
    let view = $state<HTMLDivElement | undefined>(undefined);
    let width = $state<number | undefined>(undefined);
    let height = $state<number | undefined>(undefined);
    let position = $state<{ left: number; top: number }>({ left: 0, top: 0 });

    /** Place against the anchor's live on-screen rect, in viewport
     *  coordinates, which is what `position: fixed` below expects. */
    $effect(() => {
        if (anchor === undefined || width === undefined || height === undefined)
            return;
        const rect = anchor.getBoundingClientRect();
        const { left, top } = placeNearTarget(
            {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
            },
            { width, height },
            { width: window.innerWidth, height: window.innerHeight },
        );
        position = { left, top };
    });

    /** Close on a press outside, and on a scroll, which moves the anchor out
     *  from under a panel that can't follow it. Not while the chooser is up:
     *  that is a modal dialog, and its own dismissal is the one that counts. */
    $effect(() => {
        if (anchor === undefined || more) return;
        function outside(event: PointerEvent) {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (view?.contains(target) || anchor?.contains(target)) return;
            close();
        }
        function escape(event: KeyboardEvent) {
            if (event.key === 'Escape') close();
        }
        document.addEventListener('pointerdown', outside, true);
        document.addEventListener('keydown', escape);
        window.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('pointerdown', outside, true);
            document.removeEventListener('keydown', escape);
            window.removeEventListener('scroll', close, true);
        };
    });

    function choose(emoji: string) {
        more = false;
        // Pick first, close second. The conversation remembers which message
        // the picker was opened for, and closing is what forgets it — so
        // closing first handed `pick` nothing to react to, and reacting never
        // once worked.
        pick(emoji);
        close();
    }
</script>

{#if anchor}
    <div
        {id}
        bind:this={view}
        bind:offsetWidth={width}
        bind:offsetHeight={height}
        class="choices"
        role="group"
        aria-label={$locales.getPrimaryPlainText(
            (l) => l.ui.collaborate.reaction.label,
        )}
        style:left="{position.left}px"
        style:top="{position.top}px"
    >
        {#each CommonReactions as emoji (emoji)}
            <Button
                testid="reaction-{emoji}"
                tip={() =>
                    $locales
                        .concretize((l) => l.ui.collaborate.reaction.pick, {
                            emoji: nameOf(emoji) || emoji,
                        })
                        .toText()}
                action={() => choose(emoji)}
                ><EmojisRepaired text={withDefaultColorEmoji(emoji)} /></Button
            >
        {/each}
        <Button
            tip={(l) => l.ui.collaborate.reaction.more}
            action={() => (more = true)}
            label={(l) => l.ui.collaborate.reaction.more}
        ></Button>
    </div>
{/if}
<!-- Only built once somebody asks for it: the chooser reads the whole codepoint
     table, and a Dialog constructs its children even while closed. -->
{#if more}
    <Dialog
        bind:show={more}
        header={(l) => l.ui.collaborate.reaction.label}
        explanation={(l) => l.ui.collaborate.reaction.add}
    >
        <!-- No custom characters: a reaction goes in a shared document that
             everyone in the conversation reads, and a creator's own character
             would render as nothing to all of them. -->
        <GlyphChooser showCustom={false} pick={choose} />
    </Dialog>
{/if}

<style>
    .choices {
        position: fixed;
        z-index: 3;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        max-width: 16em;
        gap: calc(var(--wordplay-spacing) / 4);
        padding: calc(var(--wordplay-spacing) / 2);
        background: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
    }
</style>
