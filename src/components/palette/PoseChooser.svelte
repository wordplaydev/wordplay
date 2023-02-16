<script lang="ts" context="module">
    export type PoseSelected = {
        property: 'enter' | 'rest' | 'move' | 'exit';
        percent: number | undefined;
    };

    const states = ['enter', 'rest', 'move', 'exit'] as const;
</script>

<script lang="ts">
    import { preferredTranslations } from '@translation/translations';

    export let selection: PoseSelected;
</script>

<!-- A pose chooser -->
<div class="pose-chooser">
    {#each states as property}
        <h3
            class="pose-state"
            class:selected={selection.property === property}
            on:mousedown={() => (selection = { property, percent: undefined })}
            >{$preferredTranslations
                .map((t) =>
                    property === 'enter'
                        ? t.output.type.enter.name
                        : property === 'rest'
                        ? t.output.type.rest.name
                        : property === 'move'
                        ? t.output.type.move.name
                        : t.output.type.exit.name
                )
                .join('/')}</h3
        >
    {/each}
</div>

<style>
    .pose-chooser {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    .pose-state {
        flex-grow: 1;
        display: inline-block;
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
        margin: 0;
        cursor: pointer;
        width: auto;
        text-align: center;
    }

    .pose-state.selected {
        cursor: auto;
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
    }
</style>
