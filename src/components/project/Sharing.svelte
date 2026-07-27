<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import { Galleries, Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import { getUser } from '@components/project/Contexts';
    import PII from '@components/project/PII.svelte';
    import Preview from '@components/project/Preview.svelte';
    import Public from '@components/project/Public.svelte';
    import Remix from '@components/project/Remix.svelte';

    interface Props {
        project: Project;
        editable: boolean;
    }

    let { project, editable }: Props = $props();

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
                />
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
