<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type LocaleText from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { SaveStatus, status } from '../../db/Database';
    import { withMonoEmoji } from '../../unicode/emoji';
    import { getUser } from '../project/Contexts';

    const user = getUser();
    let device = $derived($user === null);

    let showError = $state(false);

    let labels = $derived(
        $status.status === SaveStatus.Saved
            ? {
                  text: device
                      ? (l: LocaleText) => l.ui.save.local
                      : (l: LocaleText) => l.ui.save.saved,
                  icon: withMonoEmoji(device ? '🖥️' : '🌐'),
              }
            : $status.status === SaveStatus.Saving
              ? { text: (l: LocaleText) => l.ui.save.saving, icon: '…' }
              : {
                    text: (l: LocaleText) => l.ui.save.unsaved,
                    icon: CANCEL_SYMBOL,
                },
    );
</script>

<Button
    tip={$status.status === SaveStatus.Error
        ? (l) => l.ui.project.button.unsaved
        : (l) =>
              device
                  ? l.ui.project.button.savedLocally
                  : l.ui.project.button.savedOnline}
    action={() => (showError = true)}
    active={$status.message !== undefined}
>
    <div class="status {$status.status}" class:device>
        {labels.icon}
        <LocalizedText path={labels.text} />
    </div>
</Button>

{#if $status.message}
    <Dialog
        bind:show={showError}
        header={(l) => l.ui.project.dialog.unsaved}
        explanation={$status.message}
        closeable={true}
    ></Dialog>
{/if}

<style>
    .status {
        font-size: small;
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-alternating-color);
        color: var(--wordplay-foreground);
        height: 2em;
        display: flex;
        gap: var(--wordplay-spacing-half);
        align-items: center;
        justify-content: center;
        white-space: nowrap;
    }

    .status.error {
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        animation: shake 1s infinite;
    }

    @keyframes shake {
        0% {
            transform: rotate(-2deg);
        }
        5% {
            transform: rotate(3deg);
        }
        10% {
            transform: rotate(-1deg);
        }
        15% {
            transform: rotate(2deg);
        }
        20% {
            transform: rotate(-3deg);
        }
        25% {
            transform: rotate(0deg);
        }
    }
</style>
