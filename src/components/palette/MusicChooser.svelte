<script lang="ts">
    /**
     * Which music the palette is editing.
     *
     * Above the properties rather than beside the track carousel, because it
     * chooses the thing those properties describe — a control that changes what
     * everything below it means belongs before them, not after.
     *
     * Only shown when a project has more than one music; with one there is
     * nothing to choose and the row would be a permanent statement of the
     * obvious.
     */
    import { getSelectedOutput } from '@components/project/Contexts';
    import Options from '@components/widgets/Options.svelte';
    import { locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import readMusic, { musicsIn } from '@edit/output/editableMusic';
    import type Evaluate from '@nodes/Evaluate';

    interface Props {
        project: Project;
        /** The `Music(…)` currently selected. */
        music: Evaluate;
        editable: boolean;
    }

    let { project, music, editable }: Props = $props();

    const selection = getSelectedOutput();

    let musics = $derived(musicsIn(project));

    /** How a music is listed: its own name, or its position when it has none. */
    function labelFor(evaluate: Evaluate, at: number): string {
        const name = readMusic(project, evaluate)?.data.name ?? '';
        return name.length > 0
            ? name
            : $locales
                  .concretize((l) => l.ui.palette.music.unnamed, {
                      count: at + 1,
                  })
                  .toText();
    }

    /** Choosing a music selects it, which is what the palette already edits. */
    function choose(index: string | undefined) {
        const chosen = musics[Number(index ?? '0')];
        if (chosen === undefined || selection === undefined) return;
        // Drop the note outline first: it points into the music being left.
        selection.setFocus(project, undefined);
        selection.setPaths(project, [chosen], 'palette');
    }
</script>

{#if musics.length > 1}
    <Options
        label={(l) => l.ui.palette.music.chooser}
        value={`${musics.indexOf(music)}`}
        options={musics.map((evaluate, at) => ({
            value: `${at}`,
            label: labelFor(evaluate, at),
        }))}
        change={choose}
        {editable}
        id="music-chooser"
    />
{/if}
