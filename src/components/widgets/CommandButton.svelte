<script lang="ts">
    import { toShortcut, type Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import { locales } from '../../db/Database';
    import {
        IdleKind,
        getEditors,
        getProjectCommandContext,
    } from '../project/Contexts';
    import { tokenize } from '../../parser/Tokenizer';
    import TokenView from '../editor/TokenView.svelte';
    import { tick } from 'svelte';
    import CommandHint from './CommandHint.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';

    interface Props {
        /** If source ID isn't provided, then the one with focus is used. */
        sourceID?: string | undefined;
        command: Command;
        token?: boolean;
        focusAfter?: boolean;
        background?: boolean;
        padding?: boolean;
    }

    let {
        sourceID = undefined,
        command,
        token = false,
        focusAfter = false,
        background = false,
        padding = false,
    }: Props = $props();

    const editors = getEditors();
    const context = getProjectCommandContext();

    let view: HTMLButtonElement | undefined = $state(undefined);

    let editor = $derived(
        sourceID
            ? $editors?.get(sourceID)
            : Array.from($editors.values()).find((editor) => editor.focused),
    );

    let active = $derived(
        command.active === undefined
            ? true
            : context
              ? command.active(
                    { ...context.context, editor: editor !== undefined },
                    '',
                )
              : false,
    );
</script>

<Button
    {background}
    tip={$locales.get(command.description) + ` (${toShortcut(command)})`}
    bind:view
    uiid={command.uiid}
    {active}
    {padding}
    action={async () => {
        const hadFocus = view !== undefined && document.activeElement === view;

        if (context === undefined) return;

        // Include the caret and toggle menu we have from the editor, if we have them.
        const caretyContext = { ...context.context };
        if (editor) {
            caretyContext.caret = editor?.caret;
            caretyContext.toggleMenu = editor?.toggleMenu;
            caretyContext.editor = true;
        }

        const result = command.execute(caretyContext, '');
        if (result instanceof Promise)
            result.then((edit) =>
                editor
                    ? editor.edit(edit, IdleKind.Typed, focusAfter)
                    : undefined,
            );
        else if (typeof result !== 'boolean' && result !== undefined)
            editor?.edit(result, IdleKind.Typed, focusAfter);

        // If we didn't ask the editor to focus, restore focus on button after update.
        if (!focusAfter && hadFocus) {
            await tick();
            if (view)
                setKeyboardFocus(
                    view,
                    'Focusing on button after command if it previously had focus.',
                );
        }
    }}
    ><CommandHint {command} />{#if token}<TokenView
            node={tokenize(command.symbol).getTokens()[0]}
        />{:else if /^\p{Extended_Pictographic}+$/u.test(command.symbol)}<Emoji
            >{command.symbol}</Emoji
        >{:else}{command.symbol}{/if}</Button
>
