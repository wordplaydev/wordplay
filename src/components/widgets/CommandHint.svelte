<script lang="ts">
    import { toShortcut, type Command } from '../editor/util/Commands';
    import { getKeyboardModifiers } from '../project/Contexts';

    export let command: Command;

    const modifiers = getKeyboardModifiers();
</script>

{#if $modifiers && ((command.control && $modifiers.control) || (command.shift && $modifiers.shift) || (command.alt && $modifiers.alt))}<div
        class="hint"
        role="presentation"
        >{toShortcut(
            command,
            $modifiers.control,
            $modifiers.shift,
            $modifiers.alt
        )}</div
    >{/if}

<style>
    .hint {
        position: absolute;
        top: 60%;
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        font-size: xx-small;
        padding: calc(var(--wordplay-spacing) / 2);
        border-radius: var(--wordplay-border-radius);
        z-index: 1;
        line-height: 1;
    }
</style>
