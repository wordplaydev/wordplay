<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';

    interface Props {
        add: (newProject: Project) => void;
        /** Whether we know yet who (if anyone) is signed in. Creating a project
         *  before then makes it ownerless, which flips the project view
         *  read-only the moment auth lands and silently drops the creator's
         *  first keystrokes. */
        ready?: boolean;
        /** Sit on a header's line rather than on one of its own: no wrapping
         *  paragraph, and a small backgrounded button instead of a large bare
         *  one. Mirrors NewCharacterButton's prop of the same name. */
        inline?: boolean;
    }

    let { add, ready = true, inline = false }: Props = $props();

    let creating = $state(false);

    async function newProject() {
        creating = true;
        // Making a project needs the language runtime; imported on the click
        // rather than statically, so merely showing this button on the
        // projects list doesn't pull it in. The button spins while it loads.
        const [
            { default: Project },
            { default: Source },
            { buildKeywordIndex },
        ] = await Promise.all([
            import('@db/projects/Project'),
            import('@nodes/Source'),
            import('@parser/Keywords'),
        ]);
        add(
            Project.make(
                null,
                '',
                new Source(
                    $locales.getUnannotatedPrimaryText(
                        (l) => l.glossary.start.word,
                    ),
                    $locales.getUnannotatedPrimaryText(
                        (l) => l.ui.project.defaults.starterCode,
                    ),
                    // Recognize typed keyword words from the first keystroke,
                    // just as reloading the project would.
                    buildKeywordIndex(
                        $locales.getLocales().map((l) => l.keyword),
                    ),
                ),
                [],
                $locales.getLocales(),
            ),
        );
    }
</script>

<!-- The button is always present, so the control doesn't appear out of nowhere
     once auth lands. It's inactive until `ready` instead: creating a project
     before we know the signer-in is the hazard, not showing the button. -->
{#snippet button()}
    <Button
        tip={(l) => l.ui.page.projects.button.newproject}
        action={newProject}
        testid="addproject"
        background={inline}
        large={!inline}
        icon="+"
        active={ready && !creating}
        spinIcon={creating}
    ></Button>
{/snippet}

{#if inline}
    {@render button()}
{:else}
    <p class="add">{@render button()}</p>
{/if}
