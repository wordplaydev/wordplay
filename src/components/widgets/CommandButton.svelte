<script lang="ts">
    import { toShortcut, type Command } from '../editor/util/Commands';
    import Button from './Button.svelte';
    import { creator } from '../../db/Creator';
    import { IdleKind, getEditors, getEvaluator } from '../project/Contexts';
    import { tokenize } from '../../parser/Tokenizer';
    import TokenView from '../editor/TokenView.svelte';

    export let sourceID: string;
    export let command: Command;

    const evaluator = getEvaluator();
    const editors = getEditors();
</script>

<Button
    tip={command.description($creator.getLocale()) +
        ` (${toShortcut(command)})`}
    action={() => {
        const editor = $editors?.get(sourceID);
        if (editor) {
            const result = command.execute(
                editor.caret,
                '',
                $evaluator,
                $creator
            );
            if (typeof result === 'boolean') {
            } else if (result instanceof Promise)
                result.then((edit) => editor.edit(edit, IdleKind.Typing));
            else editor.edit(result, IdleKind.Typing);
        } else return undefined;
    }}><TokenView node={tokenize(command.symbol).getTokens()[0]} /></Button
>
