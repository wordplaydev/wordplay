<!-- Report a public project for a moderator to review (#193). -->
<script lang="ts">
    import { getAnnouncer } from '@components/project/Contexts';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import { DB, locales } from '@db/Database';
    import { firestore } from '@db/firebase';
    import type Project from '@db/projects/Project';
    import { addDoc, collection } from 'firebase/firestore';

    interface Props {
        project: Project;
        /** The reporter. Reporting requires an account: an anonymous report is
         *  unaccountable and un-rate-limitable, and the rules require the
         *  report to name its own author. */
        uid: string;
    }

    let { project, uid }: Props = $props();

    const announce = getAnnouncer();

    /** Reported once already in this session. Reporting twice does nothing —
     *  the document ID is the project and reporter together — so say so rather
     *  than letting someone press it repeatedly into the void. */
    let sent = $state(false);

    async function report() {
        if (firestore === undefined || sent) return;
        try {
            await DB.write(
                addDoc(collection(firestore, 'reports'), {
                    project: project.getID(),
                    reporter: uid,
                    time: Date.now(),
                    resolved: false,
                }),
            );
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
