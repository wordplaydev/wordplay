<script lang="ts">
    import { get } from 'svelte/store';
    import { Galleries, Projects, locales } from '../../db/Database';
    import type Project from '../../models/Project';
    import Subheader from '../app/Subheader.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Options from '../widgets/Options.svelte';
    import { getUser } from './Contexts';
    import Public from './Public.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import PII from './PII.svelte';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    const user = getUser();
</script>

{#if $user === null}
    <Feedback>{$locales.get((l) => l.ui.dialog.share.error.anonymous)}</Feedback
    >
{:else}
    <Subheader
        >{$locales.get(
            (l) => l.ui.dialog.share.subheader.gallery.header,
        )}</Subheader
    >
    <MarkupHtmlView
        markup={$locales.get(
            (l) => l.ui.dialog.share.subheader.gallery.explanation,
        )}
    />

    <Options
        id="gallerychooser"
        label={$locales.get((l) => l.ui.dialog.share.options.gallery)}
        value={project.getGallery() ?? undefined}
        options={[
            { value: undefined, label: '—' },
            ...Array.from(Galleries.accessibleGalleries.values()).map(
                (gallery) => {
                    return {
                        value: gallery.getID(),
                        label: gallery.getName($locales),
                    };
                },
            ),
        ]}
        change={(galleryID) => {
            // Ask the gallery database to put this project in the gallery.
            if (galleryID) Galleries.addProject(project, galleryID);
            else {
                Galleries.removeProject(project, null);
            }
        }}
    />

    <Public
        isPublic={project.isPublic()}
        set={(choice) => Projects.reviseProject(project.asPublic(choice === 1))}
        flags={project.getFlags()}
    />

    <PII
        nonPII={project.getNonPII()}
        unmark={(piiText) => Projects.reviseProject(project.withPII(piiText))}
    />
{/if}
