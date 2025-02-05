<script lang="ts">
    import { Galleries, Projects, locales } from '../../db/Database';
    import type Project from '../../db/projects/Project';
    import Subheader from '../app/Subheader.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Options from '../widgets/Options.svelte';
    import { getUser } from './Contexts';
    import Public from './Public.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import PII from './PII.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import { COPY_SYMBOL } from '@parser/Symbols';
    import { toClipboard } from '@components/editor/util/Clipboard';

    interface Props {
        project: Project;
    }

    let { project }: Props = $props();

    let copied = $state(false);

    const user = getUser();
</script>

{#if $user === null}
    <Feedback>{$locales.get((l) => l.ui.dialog.share.error.anonymous)}</Feedback
    >
{:else}
    <Subheader>
        {$locales.get((l) => l.ui.dialog.share.subheader.copy.header)}
    </Subheader>

    <MarkupHtmlView
        markup={$locales.get(
            (l) => l.ui.dialog.share.subheader.copy.explanation,
        )}
    />

    <Button
        background
        tip={$locales.get((l) => l.ui.project.button.copy.tip)}
        action={() => {
            copied = false;
            toClipboard(project.toWordplay());
            // In case its already pressed, show it again.
            setTimeout(() => (copied = true), 100);
        }}
        ><Emoji>{COPY_SYMBOL}</Emoji>
        {$locales.get((l) => l.ui.project.button.copy.label)}
        {#if copied}✓{/if}</Button
    >

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
