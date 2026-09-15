<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import {
        NamedKeys,
        USBaseCharacter,
        Visibility,
        type Command,
    } from '@components/editor/commands/Commands';
    import { toShortcut } from '@components/editor/commands/shortcuts';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { keyLabelFor } from '@input/Key/keyNames';
    import { TouchSupported } from '@components/util/TouchSupported';
    import { DB, keybindings, locales } from '@db/Database';
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import Notice from '@components/app/Notice.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        chordOf,
        conflictFor,
        isRemappable,
        reservationFor,
        sameChord,
        type Chord,
    } from '@db/settings/KeybindingsSetting';

    interface Props {
        command: Command;
        /** Every command the dialog lists, for detecting a chord already taken. */
        all: Command[];
    }

    let { command, all }: Props = $props();

    const announce = getAnnouncer();

    /** The chord in force, which is the creator's override when they set one. */
    let chord: Chord = $derived(chordOf(command, $keybindings));
    let overridden = $derived($keybindings[command.id] !== undefined);
    let remappable = $derived(isRemappable(command));

    /** Whether this row is listening for the creator's chosen keys. */
    let capturing = $state(false);

    /**
     * Why the last chord was refused, shown in place of the prompt.
     *
     * Announcing a refusal is not enough: a sighted creator presses a chord the
     * rules won't take and sees nothing happen at all, which reads as the
     * feature being broken rather than as an answer. Held as accessor plus
     * inputs so it renders as localized markup rather than a joined string.
     */
    let problem = $state<
        [LocaleTextAccessor, Record<string, string>] | undefined
    >(undefined);

    /**
     * While capturing, the whole window is listening, in the capture phase.
     *
     * Not the button: `Toggle` prevents the mousedown default so that clicking
     * it doesn't take focus, which would leave the keystroke going somewhere
     * else entirely. And capture phase on the window is what lets this consume
     * the chord before anything acts on it — including the editor and the
     * project's own window handler, which would otherwise *run* the very
     * command the creator is trying to rebind.
     */
    $effect(() => {
        if (!capturing) return;
        const listener = (event: KeyboardEvent) => capture(event);
        window.addEventListener('keydown', listener, true);
        return () => window.removeEventListener('keydown', listener, true);
    });

    function say(
        text: LocaleTextAccessor,
        inputs: Record<string, string> = {},
    ) {
        if (announce && $announce)
            $announce(
                'keybinding',
                $locales.getLanguages()[0],
                $locales.concretize(text, inputs).toText(),
            );
    }

    function nameOf(id: string): string {
        const found = all.find((c) => c.id === id);
        return found ? $locales.getPrimaryPlainText(found.description) : id;
    }

    /** Say it and show it: the announcement is for a screen reader, the notice
     *  for everyone else, and both come from the same string. */
    function refuse(
        text: LocaleTextAccessor,
        inputs: Record<string, string> = {},
    ) {
        problem = [text, inputs];
        say(text, inputs);
    }

    function capture(event: KeyboardEvent) {
        // Escape cancels the capture and nothing else. It must be consumed: the
        // dialog is a native `<dialog>`, whose own Escape closes it, so letting
        // it through would throw the reader out of the shortcut list rather than
        // out of this one control.
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            capturing = false;
            problem = undefined;
            return;
        }
        // Tab must always move focus — a capture control that swallowed it would
        // be a keyboard trap, which is the one thing this dialog cannot be.
        if (event.key === 'Tab') return;
        // Wait for a real key: a chord is not finished while only modifiers are
        // down, and reading one would bind "Control" to everything.
        if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;

        event.preventDefault();
        event.stopPropagation();

        // Spell the key the way the command table spells it — a named key, or
        // the character the physical key types *unshifted* on a US layout. Read
        // straight off `event.key`, Ctrl+Shift+\ captures as '|', which matches
        // no default, so rebinding a command to the chord it already had was
        // recorded as a change. `USBaseCharacter` is the same table the matcher
        // resolves with, so a captured chord is spelled like a declared one.
        const proposed: Chord = {
            key: NamedKeys.has(event.key)
                ? event.key
                : (USBaseCharacter[event.code] ?? event.key.toLowerCase()),
            shift: event.shiftKey,
            alt: event.altKey,
            control: event.metaKey || event.ctrlKey,
        };
        const shortcut = toShortcut(proposed, {
            keyLabel:
                proposed.key === undefined
                    ? undefined
                    : keyLabelFor(proposed.key, $locales),
        });

        // Refused, never stolen: taking a chord another command holds would
        // leave that one unreachable with nothing saying so.
        const reserved = reservationFor(proposed);
        if (reserved === 'unmodified') {
            refuse((l) => l.ui.dialog.help.feedback.unmodified);
            return;
        }
        if (reserved !== undefined) {
            refuse((l) => l.ui.dialog.help.feedback.reserved, { shortcut });
            return;
        }
        const taken = conflictFor(proposed, command.id, all, $keybindings);
        if (taken !== undefined) {
            refuse((l) => l.ui.dialog.help.feedback.conflict, {
                shortcut,
                command: nameOf(taken),
            });
            return;
        }

        // Picking the command's own default is not an override: storing one
        // would mark the row "changed" and pin it against a future default.
        DB.Settings.setKeybinding(
            command.id,
            sameChord(proposed, command) ? undefined : proposed,
        );
        capturing = false;
        problem = undefined;
        say((l) => l.ui.dialog.help.feedback.bound, {
            shortcut,
            command: $locales.getPrimaryPlainText(command.description),
        });
    }

    function reset() {
        DB.Settings.setKeybinding(command.id, undefined);
        say((l) => l.ui.dialog.help.feedback.reset, {
            command: $locales.getPrimaryPlainText(command.description),
        });
    }

    // The locale's own word for this key, so a reader sees what their keyboard
    // prints. Resolved here rather than in shortcuts.ts, which must import
    // nothing (it renders on every page).
    let localizedKey = $derived(
        chord.key === undefined ? undefined : keyLabelFor(chord.key, $locales),
    );

    // Only a command with a button *on this device* gets a symbol here. For the
    // rest the glyph matches nothing the reader can find and reads as an
    // arbitrary placeholder, which is why `Visibility.Invisible` has to mean "no
    // button anywhere" rather than "the toolbar doesn't render it". Touch is
    // gated the same way the toolbar gates it: on a desktop those buttons are
    // not drawn, so naming their glyph here would point at nothing.
    let hasButton = $derived(
        command.visible === Visibility.Visible ||
            command.visible === Visibility.Elsewhere ||
            (TouchSupported && command.visible === Visibility.Touch),
    );

    // A command with no chord is reached some other way. Saying only "no
    // shortcut" leaves a keyboard-only reader stuck, and the project's writing
    // guidance asks for a keyboard way to do anything done with a pointer.
    let route: LocaleTextAccessor | undefined = $derived(
        chord.key !== undefined
            ? undefined
            : command.where !== undefined
              ? (l) => l.ui.dialog.help.via.chooser
              : (l) => l.ui.dialog.help.via.toolbar,
    );
</script>

<tr class="command">
    <td class="symbol"
        >{#if hasButton}{#if command.symbolRotation !== undefined}<span
                    class="rotated"
                    style:transform="rotate({command.symbolRotation}deg)"
                    ><Emoji text={command.symbol} /></span
                >{:else}<Emoji text={command.symbol} />{/if}{/if}</td
    >
    <td class="shortcut"
        >{#if capturing}<Notice inline
                >{#if problem}<MarkupHTMLView
                        inline
                        markup={problem}
                    />{:else}<LocalizedText
                        path={(l) => l.ui.dialog.help.capture}
                    />{/if}</Notice
            >{:else if route}<span class="route"
                ><LocalizedText path={route} /></span
            >{:else}<em>{toShortcut(chord, { keyLabel: localizedKey })}</em
            >{/if}{#if overridden}{' '}<span class="custom"
                ><LocalizedText path={(l) => l.ui.dialog.help.custom} /></span
            >{/if}</td
    >
    <td class="description"><LocalizedText path={command.description} /></td>
    <td class="change"
        >{#if remappable}<Toggle
                tips={(l) => l.ui.dialog.help.change}
                on={capturing}
                toggle={() => {
                    capturing = !capturing;
                    problem = undefined;
                }}>✎</Toggle
            >{#if overridden}<Button
                    tip={(l) => l.ui.dialog.help.reset}
                    action={reset}>↺</Button
                >{/if}{/if}</td
    >
</tr>

<style>
    td {
        padding: var(--wordplay-spacing);

        vertical-align: top;
    }

    tr:nth-child(odd) {
        background: var(--wordplay-alternating-color);
    }

    /* inline-block so the symbol can be rotated about its own center, matching
       how CommandButton draws the same glyph. */
    .rotated {
        display: inline-block;
    }

    /* An AA text colour rather than opacity: opacity multiplies against whatever
       is behind, so dimmed small text stops meeting contrast (the same trap
       Hint.svelte documents). --wordplay-inactive-color points at the palette's
       AA grey, which paletteContrast.test.ts holds to 4.5:1 in both schemes. */
    .route {
        font-style: italic;
        color: var(--wordplay-inactive-color);
    }

    /* The two controls do different things; without this they read as one. */
    td.change :global(button) {
        margin-inline-end: var(--wordplay-spacing);
    }

    .custom {
        margin-inline-start: var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }
</style>
