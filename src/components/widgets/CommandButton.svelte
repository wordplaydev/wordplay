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

    /** If source ID isn't provided, then the one with focus is used. */
    export let sourceID: string | undefined = undefined;
    export let command: Command;
    export let token = false;
    export let focusAfter = false;
    export let background = false;

    const editors = getEditors();
    const context = getProjectCommandContext();

    let view: HTMLButtonElement | undefined = undefined;

    $: editor = sourceID
        ? $editors?.get(sourceID)
        : Array.from($editors.values()).find((editor) => editor.focused);

    $: active =
        command.active === undefined
            ? true
            : $context
              ? command.active($context, '')
              : false;
</script>

<Button
    {background}
    tip={$locales.get(command.description) + ` (${toShortcut(command)})`}
    bind:view
    uiid={command.uiid}
    {active}
    action={async () => {
        const hadFocus = view !== undefined && document.activeElement === view;

        if (context === undefined) return;

        // Include the caret and toggle menu we have from the editor, if we have them.
        const caretyContext = Object.assign($context);
        if (editor) {
            caretyContext.caret = editor?.caret;
            caretyContext.toggleMenu = editor?.toggleMenu;
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
            view?.focus();
        }
    }}
    ><CommandHint {command} />{#if token}<TokenView
            node={tokenize(command.symbol).getTokens()[0]}
        />{:else}<Emoji>{command.symbol}</Emoji>{/if}</Button
>
