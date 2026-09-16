<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import type { ExportStep } from '@db/export/AccountSnapshot';
    import type { ReadmeText } from '@db/export/readme';
    import { locales } from '@db/Database';
    import { getUsername } from '@db/creators/handle.svelte';
    import { isProxySession } from '@db/proxySession';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import downloadBytes from '@util/download';
    import type { User } from 'firebase/auth';

    interface Props {
        user: User;
    }

    let { user }: Props = $props();

    /** What the button is doing, which is also what the progress line says. A
     *  single piece of state rather than a boolean plus a step, since "not
     *  running" and "running, on no step" are the same thing. */
    let step: ExportStep | undefined = $state(undefined);
    let collected = $state(0);
    let problem: LocaleTextAccessor | undefined = $state(undefined);
    /** Which kinds could not be read, so the creator learns what is missing
     *  from the file they are about to open. */
    let missing: string[] = $state([]);

    /** An administrator looking at someone else's account. Answered once per
     *  page load by `isProxySession`, so reading it here is free. */
    const proxying = isProxySession();

    const announce = getAnnouncer();

    function say(
        kind: 'export' | 'export-progress',
        message: string | undefined,
    ) {
        if (announce && $announce && message !== undefined)
            $announce(kind, $locales.getLanguages()[0], message);
    }

    /** The name of one step in the creator's language, which is half of what
     *  makes two consecutive progress announcements differ. */
    function nameOf(which: ExportStep): string {
        return $locales.getPrimaryPlainText(
            (l) => l.ui.page.login.export.kind[which],
        );
    }

    /** The archive's own explanation, resolved here because the rest of the
     *  export is pure. Primary locale only: an archive is one file, and a
     *  README written in every chosen language back to back is not one a
     *  creator can read. */
    function readmeText(): ReadmeText {
        const of = (accessor: LocaleTextAccessor) =>
            $locales.getPrimaryPlainText(accessor);
        return {
            title: of((l) => l.ui.page.login.export.readme.title),
            intro: $locales
                .concretize((l) => l.ui.page.login.export.readme.intro, {
                    // The username, not `displayName` — that is the creator's
                    // character, so the archive used to say it was a copy of
                    // the account 🐙.
                    name: getUsername(user) ?? user.uid,
                    // In the creator's own language, since the rest of this
                    // file is. The system's locale is whoever's computer it is.
                    date: new Date().toLocaleDateString(
                        $locales.getLocales()[0]?.language,
                    ),
                })
                .toText(),
            contents: of((l) => l.ui.page.login.export.readme.contents),
            contentsFiles: of(
                (l) => l.ui.page.login.export.readme.contentsFiles,
            ),
            contentsAccount: of(
                (l) => l.ui.page.login.export.readme.contentsAccount,
            ),
            relationships: of(
                (l) => l.ui.page.login.export.readme.relationships,
            ),
            relationshipsWords: of(
                (l) => l.ui.page.login.export.readme.relationshipsWords,
            ),
            device: of((l) => l.ui.page.login.export.readme.device),
            formats: of((l) => l.ui.page.login.export.readme.formats),
            excluded: of((l) => l.ui.page.login.export.readme.excluded),
            privacy: of((l) => l.ui.page.login.export.readme.privacy),
            missing: of((l) => l.ui.page.login.export.readme.missing),
            manifest: of((l) => l.ui.page.login.export.readme.manifest),
            kinds: {
                account: nameOf('account'),
                projects: nameOf('projects'),
                galleries: nameOf('galleries'),
                characters: nameOf('characters'),
                howtos: nameOf('howtos'),
                chats: nameOf('chats'),
                kits: nameOf('kits'),
                classes: nameOf('classes'),
                feedback: nameOf('feedback'),
                device: nameOf('device'),
            },
        };
    }

    async function exportAccount() {
        problem = undefined;
        missing = [];
        collected = 0;
        step = 'account';
        say(
            'export',
            $locales.getPrimaryPlainText((l) => l.ui.page.login.export.started),
        );

        // Imported on press rather than at the top of the module: the profile
        // page should not carry the whole query surface and the zip writer just
        // to render a button, and this is the repo's convention for a module
        // only a press can reach.
        //
        // Wrapped because a dynamic import can fail on its own — a dropped
        // connection mid-load — and an unhandled rejection here would leave the
        // spinner turning with no way back to the button.
        let run;
        try {
            run = (await import('@db/export/exportAccount')).default;
        } catch {
            step = undefined;
            problem = (l) => l.ui.page.login.export.offline;
            say('export', $locales.getPrimaryPlainText(problem));
            return;
        }

        const result = await run(user, readmeText(), (which, count) => {
            step = which;
            collected = count;
            // Names the step *and* the running count, so two firings never
            // share text — an unchanged live region is a silent one, and the
            // count alone repeats whenever two collections in a row are empty.
            say(
                'export-progress',
                $locales
                    .concretize((l) => l.ui.page.login.export.progress, {
                        kind: nameOf(which),
                        count,
                    })
                    .toText(),
            );
        }).catch(() => undefined);

        step = undefined;

        if (result === undefined) {
            // Nothing below can explain an error the export did not expect, so
            // say the general thing rather than leaving the card silent.
            problem = (l) => l.ui.page.login.export.failed;
            say('export', $locales.getPrimaryPlainText(problem));
            return;
        }
        if (result.kind === 'refused') {
            problem = (l) => l.ui.page.login.export.failed;
            return;
        }
        if (result.kind === 'failed') {
            problem =
                result.reason === 'too-large'
                    ? (l) => l.ui.page.login.export.tooLarge
                    : result.reason === 'offline'
                      ? (l) => l.ui.page.login.export.offline
                      : (l) => l.ui.page.login.export.failed;
            say('export', $locales.getPrimaryPlainText(problem));
            return;
        }

        missing = result.gaps.map((gap) => nameOf(gap.collection));
        downloadBytes(result.bytes, result.name, 'application/zip');
        say(
            'export',
            missing.length === 0
                ? $locales
                      .concretize((l) => l.ui.page.login.export.finished, {
                          name: result.name,
                          count: result.count,
                      })
                      .toText()
                : $locales
                      .concretize(
                          (l) => l.ui.page.login.export.finishedPartial,
                          {
                              name: result.name,
                              count: result.count,
                              missing: missing.length,
                          },
                      )
                      .toText(),
        );
    }
</script>

{#if proxying}
    <!-- Shown rather than hidden: a read-only session must look honest about
         what it is, so the reason is stated instead of the control quietly
         going missing. -->
    <MarkupHTMLView markup={(l) => l.ui.page.login.export.proxy} />
{:else}
    <MarkupHTMLView markup={(l) => l.ui.page.login.export.prompt} />
    {#if step === undefined}
        <Button
            background
            tip={(l) => l.ui.page.login.export.button.tip}
            action={exportAccount}
            label={(l) => l.ui.page.login.export.button.label}
            testid="export-account"
        />
    {:else}
        <!-- The spinner's own label never changes. It carries `role="status"`,
             which is a live region of its own, so a label that changed per step
             would compete with the Announcer for the same words. The step is
             said below, as ordinary text, and announced through the Announcer. -->
        <p>
            <Spinning label={(l) => l.ui.page.login.export.started} />
        </p>
        <p aria-hidden="true">
            <MarkupHTMLView
                inline
                markup={[
                    (l) => l.ui.page.login.export.progress,
                    { kind: nameOf(step), count: collected },
                ]}
            />
        </p>
    {/if}
    {#if problem}<Notice text={problem} />{/if}
    {#if missing.length > 0}
        <Notice
            ><MarkupHTMLView
                inline
                markup={[
                    (l) => l.ui.page.login.export.incomplete,
                    { kinds: missing.join(', ') },
                ]}
            /></Notice
        >
    {/if}
{/if}
