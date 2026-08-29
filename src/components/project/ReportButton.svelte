<!-- Report a public project for a moderator to review (#193). -->
<script lang="ts">
    import { getAnnouncer } from '@components/project/Contexts';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import { DB, locales } from '@db/Database';
    import sendReport from '@db/moderation/report';
    import type Project from '@db/projects/Project';

    interface Props {
        project: Project;
    }

    // No uid: the callable takes the reporter from the caller's own auth token,
    // which is the only account it will accept — an anonymous report is
    // unaccountable and un-rate-limitable. A uid passed in here would look
    // authoritative and never be read.
    let { project }: Props = $props();

    const announce = getAnnouncer();

    /** Reported once already in this session. Reporting twice genuinely does
     *  nothing now — the report's document id is derived from what's being
     *  reported, so a second press joins the existing request — but say so
     *  rather than letting someone press it repeatedly into the void. */
    let sent = $state(false);

    async function report() {
        if (sent) return;
        try {
            await sendReport({ kind: 'project', subject: project.getID() });
        } catch (error) {
            DB.reportBanner((l) => l.ui.banner.saveFailed, error);
            return;
        }
        sent = true;
        // Names the project, so reporting two different things in a session
        // doesn't produce the same sentence twice — an unchanged live region
        // stays silent.
        if (announce && $announce)
            $announce(
                'notification',
                $locales.getLanguages()[0],
                $locales
                    .concretize((l) => l.moderation.report.announce, {
                        project: project.getName(),
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
    testid="report-project"
></ConfirmButton>
