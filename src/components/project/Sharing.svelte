<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import { Galleries, locales } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import type Project from '@db/projects/Project';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import { getUser } from '@components/project/Contexts';
    import PII from '@components/project/PII.svelte';
    import Preview from '@components/project/Preview.svelte';
    import Public from '@components/project/Public.svelte';
    import Remix from '@components/project/Remix.svelte';
    import { projectVisibility } from '@db/moderation/visibility';

    interface Props {
        project: Project;
        editable: boolean;
    }

    let { project, editable }: Props = $props();

    /** The gallery this project is in, so the share dialog can say who reviews
     *  what's shared here — which depends on the gallery as much as on the
     *  public toggle (#938). */
    const gallery = $derived(
        project.getGallery() === null
            ? undefined
            : Galleries.accessibleGalleries.get(project.getGallery() ?? ''),
    );

    /** Index into the tab labels; see `ui.dialog.share.tab`. */
    let tab = $state(0);

    const user = getUser();
</script>

{#if $user === null}
    <!-- No sharing controls without an account, but provenance is read-only
         attribution and the source of a public remix is readable by signed-out
         viewers, so someone looking at a remix can still see whose work it
         builds on. -->
    <Notice text={(l) => l.ui.dialog.share.error.anonymous} />
    <Remix {project} {editable} />
{:else}
    <!-- Copying the project as text sits with the dialog's title (see
         ProjectFooter's headerControls), not here: it's one action on the whole
         project, not one of the settings these tabs switch between. -->
    <Tabbed
        id="share-tabs"
        tabs={(l) => l.ui.dialog.share.tab}
        choice={tab}
        select={(choice) => (tab = choice)}
    >
        {#snippet children()}
            {#if tab === 0}
                <!-- No headers in any panel: the tab already names the section. -->
                <MarkupHTMLView
                    markup={(l) =>
                        l.ui.dialog.share.subheader.gallery.explanation}
                />
                <Options
                    id="gallerychooser"
                    label={(l) => l.ui.dialog.share.options.gallery}
                    value={project.getGallery() ?? undefined}
                    options={[
                        { value: undefined, label: '—' },
                        ...Array.from(
                            Galleries.accessibleGalleries.values(),
                        ).map((gallery) => {
                            return {
                                value: gallery.getID(),
                                label: gallery.getName($locales),
                            };
                        }),
                    ]}
                    change={(galleryID) => {
                        // Ask the gallery database to put this project in the gallery.
                        if (galleryID) Galleries.addProject(project, galleryID);
                        else {
                            Galleries.removeProject(project, null);
                        }
                    }}
                />
            {:else if tab === 1}
                <Public
                    isPublic={project.isPublic()}
                    header={false}
                    set={(choice) =>
                        Projects.reviseProject(project.asPublic(choice === 1))}
                    flags={project.getFlags()}
                    checkStanding
                    visibility={projectVisibility(project, gallery)}
                />
                <!-- Research consent lives with public/private because it's a
                     second, narrower permission about the same project, not a
                     sixth kind of sharing. Only the owner sees it: consent is
                     given by the person whose work it is, not by a
                     collaborator on their behalf. -->
                {#if $user !== undefined && project.isOwner($user.uid)}
                    <Subheader
                        text={(l) =>
                            l.ui.dialog.share.subheader.research.header}
                    />
                    <MarkupHTMLView
                        markup={(l) =>
                            l.ui.dialog.share.subheader.research.explanation}
                    />
                    <Mode
                        modes={(l) => l.ui.dialog.share.mode.research}
                        choice={project.hasResearchConsent() ? 1 : 0}
                        select={(choice) =>
                            Projects.reviseProject(
                                project.withResearchConsent(choice === 1),
                            )}
                        icons={['🚫', '🔬']}
                    />
                {/if}
            {:else if tab === 2}
                <Preview {project} />
            {:else if tab === 3}
                <PII
                    nonPII={project.getNonPII()}
                    unmark={(piiText) =>
                        Projects.reviseProject(project.withPII(piiText))}
                />
            {:else}
                <Remix {project} {editable} />
            {/if}
        {/snippet}
    </Tabbed>
{/if}
