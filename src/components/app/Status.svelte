<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import type LocaleText from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import {
        disconnected,
        locales,
        SaveFailureReason,
        SaveStatus,
        status,
        type SaveFailure,
    } from '@db/Database';
    import { withMonoEmoji } from '@unicode/emoji';
    import { getUser } from '@components/project/Contexts';

    const user = getUser();
    let device = $derived($user === null);

    let showError = $state(false);

    // When the user is signed in but Firebase is unreachable, the SDK silently
    // queues writes — `persist()` sets Status to Saved after the local write
    // and then awaits the online batch.commit(), which hangs without resolving
    // or rejecting. So Status.status stays "Saved" even though the latest
    // edits haven't synced. Treat that combination as an error in the UI so
    // the indicator matches the connection banner.
    let effectiveStatus = $derived(
        !device && $disconnected && $status.status === SaveStatus.Saved
            ? SaveStatus.Error
            : $status.status,
    );

    let labels = $derived(
        effectiveStatus === SaveStatus.Saved
            ? {
                  text: device
                      ? (l: LocaleText) => l.ui.save.local
                      : (l: LocaleText) => l.ui.save.saved,
                  icon: withMonoEmoji(device ? '🖥️' : '🌐'),
              }
            : effectiveStatus === SaveStatus.Saving
              ? { text: (l: LocaleText) => l.ui.save.saving, icon: '…' }
              : {
                    text: (l: LocaleText) => l.ui.save.unsaved,
                    icon: CANCEL_SYMBOL,
                },
    );

    /** Map each reason enum value to the locale accessor for its explanation. */
    const REASON_TEXT: Record<
        SaveFailure['reason'],
        (l: LocaleText) => string
    > = {
        [SaveFailureReason.IndexedDBWriteFailed]: (l) =>
            l.ui.project.save.failureReason.indexedDBWriteFailed,
        [SaveFailureReason.IndexedDBUnsupported]: (l) =>
            l.ui.project.save.failureReason.indexedDBUnsupported,
        [SaveFailureReason.FirestoreBatchFailed]: (l) =>
            l.ui.project.save.failureReason.firestoreBatchFailed,
        [SaveFailureReason.ProjectContainsPII]: (l) =>
            l.ui.project.save.failureReason.projectContainsPII,
    };

    // Group failures by reason so a typical batch-failure case (all projects
    // share one cause) shows one explanation with the list of names below it.
    let failureGroups = $derived.by(() => {
        const groups = new Map<SaveFailure['reason'], SaveFailure[]>();
        for (const failure of $status.failures) {
            const existing = groups.get(failure.reason);
            if (existing) existing.push(failure);
            else groups.set(failure.reason, [failure]);
        }
        return Array.from(groups.entries());
    });

    let failuresHeader = $derived(
        $status.failures.length > 0
            ? $locales.concretize(
                  (l) => l.ui.project.save.failuresHeader,
                  { count: $status.failures.length },
              )
            : undefined,
    );

    let hasDialog = $derived(
        $status.message !== undefined || $status.failures.length > 0,
    );
</script>

<Button
    tip={effectiveStatus === SaveStatus.Error
        ? (l) => l.ui.project.button.unsaved
        : (l) =>
              device
                  ? l.ui.project.button.savedLocally
                  : l.ui.project.button.savedOnline}
    action={() => (showError = true)}
    active={hasDialog}
>
    <div class="status {effectiveStatus}" class:device>
        {labels.icon}
        <LocalizedText path={labels.text} />
    </div>
</Button>

{#if hasDialog}
    <Dialog
        bind:show={showError}
        header={(l) => l.ui.project.dialog.unsaved}
        explanation={$status.message}
        closeable={true}
    >
        {#if $status.failures.length > 0 && failuresHeader}
            <p class="failures-header">
                <MarkupHTMLView markup={failuresHeader} />
            </p>
            {#each failureGroups as [reason, group] (reason)}
                <section class="failure-group">
                    <p class="reason">
                        <LocalizedText path={REASON_TEXT[reason]} />
                    </p>
                    <ul class="projects">
                        {#each group as failure (failure.projectId)}
                            <li>
                                <span class="name">{failure.projectName}</span>
                                {#if failure.detail}
                                    <span class="detail">{failure.detail}</span>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </section>
            {/each}
        {/if}
    </Dialog>
{/if}

<style>
    .failures-header {
        margin: 0;
        font-weight: bold;
    }

    .failure-group {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    .failure-group .reason {
        margin: 0;
    }

    .failure-group .projects {
        margin: 0;
        padding-inline-start: 1.5em;
    }

    .failure-group .projects .name {
        font-weight: bold;
    }

    .failure-group .projects .detail {
        margin-inline-start: var(--wordplay-spacing-half);
        opacity: 0.6;
        font-size: smaller;
        font-family: var(--wordplay-code-font, monospace);
    }

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
