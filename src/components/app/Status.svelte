<script lang="ts">
    import Dialog from '@components/widgets/Dialog.svelte';
    import { SaveStatus, locales } from '../../db/Database';
    import { status } from '../../db/Database';
    import { getUser } from '../project/Contexts';
    import Button from '@components/widgets/Button.svelte';

    const user = getUser();
    $: device = $user === null;

    let showError = false;
</script>

<Button
    tip={$locales.get((l) => l.ui.project.button.unsaved)}
    action={() => (showError = true)}
    active={$status.message !== undefined}
>
    <div class="status {$status.status}" class:device>
        {$status.status === SaveStatus.Saved
            ? `${
                  device
                      ? $locales.get((l) => l.ui.save.local)
                      : $locales.get((l) => l.ui.save.saved)
              } ✔`
            : $status.status === SaveStatus.Saving
              ? `${$locales.get((l) => l.ui.save.saving)} …`
              : `${$locales.get((l) => l.ui.save.unsaved)} ⨉`}
    </div>
</Button>

{#if $status.message}
    <Dialog
        bind:show={showError}
        description={{
            header: $locales.get((l) => l.ui.project.dialog.unsaved),
            explanation: $status.message($locales.getLocale()),
        }}
        closeable={true}
    ></Dialog>
{/if}

<style>
    .status {
        font-size: small;
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-warning);
        color: var(--wordplay-background);
        height: 2em;
        display: flex;
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
