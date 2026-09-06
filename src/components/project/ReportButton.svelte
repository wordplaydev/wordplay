<!-- Ask whoever is responsible to review something (#193, generalized by
     #938's subject kinds and used for characters by #822). Responsibility
     follows the subject's visibility, so this button is the same button
     wherever it appears; only what it names changes. -->
<script lang="ts">
    import { getAnnouncer } from '@components/project/Contexts';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import { DB, locales } from '@db/Database';
    import sendReport from '@db/moderation/report';
    import type { ReportSubjectKind } from 'shared-types';

    interface Props {
        /** What sort of thing is being reported. */
        kind: ReportSubjectKind;
        /** Its document id. */
        subject: string;
        /** What to call it when announcing that the report was sent. */
        name: string;
    }

    // No uid: the callable takes the reporter from the caller's own auth token,
    // which is the only account it will accept — an anonymous report is
    // unaccountable and un-rate-limitable. A uid passed in here would look
    // authoritative and never be read.
    let { kind, subject, name }: Props = $props();

    const announce = getAnnouncer();

    /** Reported once already in this session. Reporting twice genuinely does
     *  nothing now — the report's document id is derived from what's being
     *  reported, so a second press joins the existing request — but say so
     *  rather than letting someone press it repeatedly into the void. */
    let sent = $state(false);

    async function report() {
        if (sent) return;
        try {
            await sendReport({ kind, subject });
        } catch (error) {
            DB.reportBanner((l) => l.ui.banner.saveFailed, error);
            return;
        }
        sent = true;
        // Names the thing, so reporting two different things in a session
        // doesn't produce the same sentence twice — an unchanged live region
        // stays silent. The template's input is still called `project`: the
        // sentence it builds ("a moderator has been asked to look at X") is
        // already neutral, and renaming an internal input across thirty
        // locales would re-queue every one of them for translation.
        if (announce && $announce)
            $announce(
                'notification',
                $locales.getLanguages()[0],
                $locales
                    .concretize((l) => l.moderation.report.announce, {
                        project: name,
                    })
                    .toText(),
            );
    }
</script>

<ConfirmButton
    tip={sent
        ? (l) => l.moderation.report.sent
        : (l) => l.moderation.report.button}
    prompt={(l) => l.moderation.report.confirm}
    enabled={!sent}
    action={report}
    background
    icon="⚑"
    testid="report-{kind}"
></ConfirmButton>
