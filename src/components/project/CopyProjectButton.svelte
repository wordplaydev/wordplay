<!-- Copies a project to the clipboard as Wordplay source. Lives beside the share
     dialog's title rather than in its body: it's a single action on the project
     as a whole, not one of the settings the dialog's tabs switch between. -->
<script lang="ts">
    import { toClipboard } from '@components/editor/commands/Clipboard';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type Project from '@db/projects/Project';
    import { CONFIRM_SYMBOL, PASTE_SYMBOL } from '@parser/Symbols';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    let copied = $state(false);

    const user = getUser();
</script>

{#if $user !== null}
    <Button
        background
        tip={(l) => l.ui.project.button.copy.tip}
        action={() => {
            copied = false;
            toClipboard(project.toWordplay());
            // In case its already pressed, show it again.
            setTimeout(() => (copied = true), 100);
        }}
        icon={PASTE_SYMBOL}
    >
        <LocalizedText path={(l) => l.ui.project.button.copy.label} />
        {#if copied}{CONFIRM_SYMBOL}{/if}</Button
    >
{/if}
