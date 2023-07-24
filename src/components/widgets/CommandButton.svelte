<script lang="ts">
    import { toShortcut, type Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import { creator } from '../../db/Creator';
    import { IdleKind, getEditors, getEvaluator } from '../project/Contexts';
    import { tokenize } from '../../parser/Tokenizer';
    import TokenView from '../editor/TokenView.svelte';
    import { tick } from 'svelte';

    /** If source ID isn't provided, then the one with focus is used. */
    export let sourceID: string | undefined = undefined;
    export let command: Command;
    export let token: boolean = false;

    const evaluator = getEvaluator();
    const editors = getEditors();

    let view: HTMLButtonElement | undefined = undefined;

    $: editor = sourceID
        ? $editors?.get(sourceID)
        : Array.from($editors.values()).find((editor) => editor.focused);
</script>

<Button
    tip={command.description($creator.getLocale()) +
        ` (${toShortcut(command)})`}
    bind:view
    active={command.active === undefined
        ? true
        : editor
        ? command.active(
              { caret: editor.caret, evaluator: $evaluator, creator: $creator },
              ''
          )
        : false}
    action={async () => {
        if (editor) {
            const result = command.execute(
                {
                    caret: editor.caret,
                    evaluator: $evaluator,
                    creator: $creator,
                    toggleMenu: editor.toggleMenu,
                },
                ''
            );
            if (typeof result === 'boolean') {
            } else if (result instanceof Promise)
                result.then((edit) =>
                    editor ? editor.edit(edit, IdleKind.Typing) : undefined
                );
            else if (result !== undefined) editor.edit(result, IdleKind.Typing);

            // Restore focus on button after update.
            await tick();
            view?.focus();
        } else return undefined;
    }}
    >{#if token}<TokenView
            node={tokenize(command.symbol).getTokens()[0]}
        />{:else}{command.symbol}{/if}</Button
>

<style>
    :global(button:focus .token-view) {
        color: var(--wordplay-highlight);
    }
</style>