<script lang="ts">
    import { getUser } from '@components/project/Contexts';
    import Dialog from '@components/widgets/Dialog.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        DB,
        disconnected,
        firebaseReachable,
        onlineStatus,
        SaveStatus,
        status,
        SyncDomains,
        syncState,
        type SaveCounts,
        type SaveFailureReason,
        type SyncDomain,
    } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type LocaleText from '@locale/LocaleText';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { withMonoEmoji } from '@unicode/emoji';

    const user = getUser();
    let device = $derived($user === null);

    let showError = $state(false);

    /** When disconnected, the explanation shown inside the dialog (moved here
     *  from the old connection banner): browser-offline vs cloud-unreachable. */
    const connectionMessage: LocaleTextAccessor | undefined = $derived(
        !$disconnected
            ? undefined
            : !$onlineStatus
              ? (l) => l.ui.connection.offline
              : !$firebaseReachable
                ? (l) => l.ui.connection.unreachable
                : undefined,
    );

    /** Per-domain row labels, reused for the counts table and error groups. */
    const SYNC_LABEL: Record<SyncDomain, (l: LocaleText) => string> = {
        projects: (l) => l.ui.save.sync.projects,
        galleries: (l) => l.ui.save.sync.galleries,
        characters: (l) => l.ui.save.sync.characters,
        howtos: (l) => l.ui.save.sync.howtos,
        chats: (l) => l.ui.save.sync.chats,
    };

    /** Map each save-failure reason to the locale accessor for its explanation.
     *  Reused across every document type — `firestoreBatchFailed` reads
     *  document-type-neutrally. */
    const REASON_TEXT: Record<SaveFailureReason, (l: LocaleText) => string> = {
        'indexed-db-write-failed': (l) =>
            l.ui.project.save.failureReason.indexedDBWriteFailed,
        'local-project-storage-failed': (l) =>
            l.ui.project.save.failureReason.localProjectStorageFailed,
        'indexed-db-unsupported': (l) =>
            l.ui.project.save.failureReason.indexedDBUnsupported,
        'firestore-batch-failed': (l) =>
            l.ui.project.save.failureReason.firestoreBatchFailed,
        'project-contains-pii': (l) =>
            l.ui.project.save.failureReason.projectContainsPII,
    };

    /** Per-domain save counts (saved on this device, in the cloud, unsaved). */
    let counts = $derived<Record<SyncDomain, SaveCounts>>({
        projects: DB.Projects.saveCounts,
        galleries: DB.Galleries.saveCounts,
        characters: DB.Characters.saveCounts,
        howtos: DB.HowTos.saveCounts,
        chats: DB.Chats.saveCounts,
    });

    /** Total items across all domains with edits not yet saved online. */
    let totalUnsaved = $derived(
        SyncDomains.reduce((sum, domain) => sum + counts[domain].unsaved, 0),
    );

    /** The button's icon, label, tooltip, and whether to draw attention.
     *
     *  Offline is two different situations now that we track unsaved work per
     *  item: if nothing is actually pending, the work is safe on this device and
     *  we just can't reach the cloud — show "offline", not the alarming
     *  "unsaved". Only a real save error, or being offline WITH unsynced edits,
     *  shows "unsaved". */
    let display = $derived.by(() => {
        const offline = !device && $disconnected;
        if (offline && totalUnsaved === 0)
            return {
                icon: withMonoEmoji('🖥️'),
                spin: false,
                text: (l: LocaleText) => l.ui.save.status.state.offline,
                tip: (l: LocaleText) => l.ui.project.button.savedLocally,
                // Salient (same as the unsaved state) so being offline is
                // noticeable, even though the work itself is safe locally.
                salient: true,
            };
        if ($status.status === SaveStatus.Error || offline)
            return {
                icon: CANCEL_SYMBOL,
                spin: false,
                text: (l: LocaleText) => l.ui.save.unsaved,
                tip: (l: LocaleText) => l.ui.project.button.unsaved,
                salient: true,
            };
        if ($status.status === SaveStatus.Saving)
            return {
                // Spin the same icon the saved state shows, so saving reads as
                // "working toward saved" rather than an ambiguous "…".
                icon: withMonoEmoji(device ? '🖥️' : '🌐'),
                spin: true,
                text: (l: LocaleText) => l.ui.save.saving,
                tip: (l: LocaleText) =>
                    device
                        ? l.ui.project.button.savedLocally
                        : l.ui.project.button.savedOnline,
                salient: false,
            };
        // Initial cloud sync: a signed-in, online session where some domain
        // hasn't finished its first sync yet (the serial init brings them
        // online one at a time). Spin the globe so the toolbar shows the
        // connection is in progress, instead of prematurely reading "saved".
        if (
            !device &&
            !$disconnected &&
            SyncDomains.some(
                (d) =>
                    $syncState[d].status === 'initializing' ||
                    $syncState[d].status === 'syncing',
            )
        )
            return {
                icon: withMonoEmoji('🌐'),
                spin: true,
                text: (l: LocaleText) => l.ui.save.status.state.loading,
                tip: (l: LocaleText) => l.ui.project.button.savedOnline,
                salient: false,
            };
        return {
            icon: withMonoEmoji(device ? '🖥️' : '🌐'),
            spin: false,
            text: device
                ? (l: LocaleText) => l.ui.save.local
                : (l: LocaleText) => l.ui.save.saved,
            tip: (l: LocaleText) =>
                device
                    ? l.ui.project.button.savedLocally
                    : l.ui.project.button.savedOnline,
            salient: false,
        };
    });

    /** A save failure tagged with the domain it came from, so the dialog can
     *  show errors for every document type in one place. */
    type DomainError = {
        domain: SyncDomain;
        key: string;
        name: string | undefined;
        reason: SaveFailureReason;
        detail: string | undefined;
    };

    /** All save failures across every document type. Projects keep their richer
     *  failure flow via the `status` store; the other domains expose `saveErrors`. */
    let allErrors = $derived<DomainError[]>([
        ...$status.failures.map(
            (f): DomainError => ({
                domain: 'projects',
                key: f.projectId,
                name: f.projectName,
                reason: f.reason,
                detail: f.detail,
            }),
        ),
        ...DB.Galleries.saveErrors.map(
            (e): DomainError => ({
                domain: 'galleries',
                key: e.id,
                name: e.name,
                reason: e.reason,
                detail: e.detail,
            }),
        ),
        ...DB.Characters.saveErrors.map(
            (e): DomainError => ({
                domain: 'characters',
                key: e.id,
                name: e.name,
                reason: e.reason,
                detail: e.detail,
            }),
        ),
        ...DB.HowTos.saveErrors.map(
            (e): DomainError => ({
                domain: 'howtos',
                key: e.id,
                name: e.name,
                reason: e.reason,
                detail: e.detail,
            }),
        ),
        ...DB.Chats.saveErrors.map(
            (e): DomainError => ({
                domain: 'chats',
                key: e.id,
                name: e.name,
                reason: e.reason,
                detail: e.detail,
            }),
        ),
    ]);

    /** The errors grouped by domain, for a per-kind "couldn't save" list. */
    let errorsByDomain = $derived.by(() => {
        const groups = new Map<SyncDomain, DomainError[]>();
        for (const error of allErrors) {
            const list = groups.get(error.domain);
            if (list) list.push(error);
            else groups.set(error.domain, [error]);
        }
        return Array.from(groups.entries());
    });

    /** A word + css kind describing how a domain is syncing with the cloud. */
    function stateOf(domain: SyncDomain): {
        label: (l: LocaleText) => string;
        kind: string;
    } {
        if ($disconnected)
            return {
                label: (l) => l.ui.save.status.state.offline,
                kind: 'offline',
            };
        switch ($syncState[domain].status) {
            case 'updated':
                return {
                    label: (l) => l.ui.save.status.state.synced,
                    kind: 'synced',
                };
            case 'syncing':
                return {
                    label: (l) => l.ui.save.status.state.syncing,
                    kind: 'syncing',
                };
            case 'failed':
                return {
                    label: (l) => l.ui.save.status.state.failed,
                    kind: 'failed',
                };
            default:
                return {
                    label: (l) => l.ui.save.status.state.loading,
                    kind: 'loading',
                };
        }
    }
</script>

<Dialog
    id="status"
    bind:show={showError}
    header={(l) => l.ui.save.status.header}
    explanation={$status.message}
    closeable={true}
    button={{
        tip: display.tip,
        icon: display.icon,
        spinIcon: display.spin,
        label: display.text,
        background: display.salient ? 'salient' : true,
        testid: 'save-status',
    }}
>
    {#if connectionMessage}
        <p class="connection" data-testid="connection-status">
            <LocalizedText path={connectionMessage} markup={false} />
        </p>
    {/if}
    {#if !device}
        <p class="intro">
            <LocalizedText path={(l) => l.ui.save.status.intro} />
        </p>
        <table class="save-counts">
            <thead>
                <tr>
                    <th></th>
                    <th>
                        <LocalizedText
                            path={(l) => l.ui.save.status.columns.device}
                        />
                    </th>
                    <th>
                        <LocalizedText
                            path={(l) => l.ui.save.status.columns.cloud}
                        />
                    </th>
                    <th>
                        <LocalizedText
                            path={(l) => l.ui.save.status.columns.unsaved}
                        />
                    </th>
                </tr>
            </thead>
            <tbody>
                {#each SyncDomains as domain (domain)}
                    {@const c = counts[domain]}
                    {@const s = stateOf(domain)}
                    <tr>
                        <th class="domain" scope="row">
                            <LocalizedText path={SYNC_LABEL[domain]} />
                        </th>
                        <td>{c.device}</td>
                        <td>{c.cloud}</td>
                        <td class:unsaved={c.unsaved > 0}>{c.unsaved}</td>
                        <td class="state {s.kind}">
                            <LocalizedText path={s.label} />
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
        <p class="legend">
            <LocalizedText path={(l) => l.ui.save.status.legend} />
        </p>
    {/if}

    {#if allErrors.length > 0}
        <section class="errors">
            <p class="errors-header">
                <LocalizedText path={(l) => l.ui.save.status.errorsHeader} />
            </p>
            {#each errorsByDomain as [domain, errors] (domain)}
                <section class="error-group">
                    <p class="domain">
                        <LocalizedText path={SYNC_LABEL[domain]} />
                    </p>
                    <ul>
                        {#each errors as error (error.key)}
                            <li>
                                <span class="name">
                                    {#if error.name}{error.name}{:else}<LocalizedText
                                            path={(l) =>
                                                l.ui.save.status.conversation}
                                        />{/if}
                                </span>
                                <span class="reason">
                                    <MarkupHTMLView
                                        inline
                                        markup={REASON_TEXT[error.reason]}
                                    />
                                </span>
                                {#if error.detail}
                                    <span class="detail">{error.detail}</span>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </section>
            {/each}
        </section>
    {/if}
</Dialog>

<style>
    .intro {
        margin: 0;
    }

    /* The offline/unreachable explanation, moved here from the old connection
       banner. Tinted with the error color so it reads as a status, not body. */
    .connection {
        margin: 0;
        color: var(--wordplay-error);
        font-weight: bold;
    }

    .save-counts {
        border-collapse: collapse;
        width: 100%;
        font-size: small;
    }

    .save-counts th,
    .save-counts td {
        padding: var(--wordplay-spacing-half);
        text-align: end;
    }

    .save-counts thead th {
        font-weight: normal;
        opacity: 0.7;
    }

    .save-counts th.domain {
        text-align: start;
        font-weight: bold;
    }

    .save-counts td.unsaved {
        color: var(--wordplay-error);
        font-weight: bold;
    }

    .save-counts td.state {
        text-align: end;
    }

    .save-counts td.state.failed,
    .save-counts td.state.offline {
        color: var(--wordplay-error);
    }

    .legend {
        margin: 0;
        opacity: 0.7;
        font-size: smaller;
    }

    .errors {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    .errors-header {
        margin: 0;
        font-weight: bold;
        color: var(--wordplay-error);
    }

    .error-group {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    .error-group .domain {
        margin: 0;
        font-weight: bold;
    }

    .error-group ul {
        margin: 0;
        padding-inline-start: 1.5em;
    }

    .error-group .name {
        font-weight: bold;
    }

    .error-group .reason {
        margin-inline-start: var(--wordplay-spacing-half);
    }

    .error-group .detail {
        margin-inline-start: var(--wordplay-spacing-half);
        opacity: 0.6;
        font-size: smaller;
        font-family: var(--wordplay-code-font, monospace);
    }
</style>
