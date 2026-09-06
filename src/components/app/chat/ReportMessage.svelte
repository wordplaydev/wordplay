<!-- The flag that asks a chat message be reviewed.

     Its own component because the dialog's open state has to be per message:
     ChatView renders one of these inside a snippet repeated for every message,
     and a single shared `show` boolean in the parent opened every message's
     dialog at once. -->
<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import ResponsibilityNotice from '@components/moderation/ResponsibilityNotice.svelte';
    import type { Visibility } from 'shared-types';

    interface Props {
        /** Called when the reader confirms. Closes the dialog. */
        report: () => void;
        /** What is being reported, so the dialog can name who will read it
         *  before anyone sends it — "sent to the gallery curators" was true
         *  only for a gallery chat, and said nothing about which gallery. */
        visibility?: Visibility | undefined;
    }

    let { report, visibility = undefined }: Props = $props();

    let show = $state(false);
</script>

<Dialog
    bind:show
    header={(l) => l.ui.collaborate.moderation.header}
    explanation={(l) => l.ui.collaborate.moderation.explanation}
    button={{
        tip: (l) => l.ui.collaborate.moderation.report.tip,
        icon: '🚩',
    }}
>
    {#if visibility}
        <ResponsibilityNotice {visibility} />
    {/if}
    <Button
        background
        tip={(l) => l.ui.collaborate.moderation.report.tip}
        label={(l) => l.ui.collaborate.moderation.report.label}
        action={() => {
            show = false;
            report();
        }}
    />
</Dialog>
