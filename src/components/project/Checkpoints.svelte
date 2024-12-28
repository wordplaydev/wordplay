<script module lang="ts">
    const Minute = 60 * 1000;
    const Hour = 60 * Minute;
    const Day = 24 * Hour;
    const Week = 7 * Day;
    const Month = 30 * Day;

    export type CheckpointsText = {
        button: {
            clear: string;
            select: string;
            checkpoint: string;
        };
    };
</script>

<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import { locales, Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { onMount } from 'svelte';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import Emoji from '@components/app/Emoji.svelte';

    let { project }: { project: Project } = $props();

    let now = $state(Date.now());
    onMount(() => {
        const timeout = setInterval(() => (now = Date.now()), 1000);
        return () => clearInterval(timeout);
    });

    function getDelta(time: number): { number: number; unit: string } {
        const delta = now - time;
        if (delta < Minute)
            return {
                number: Math.round(delta / Minute),
                unit: 's',
            };
        else if (delta < Hour)
            return { number: Math.round(delta / Hour), unit: 'min' };
        else if (delta < Day)
            return {
                number: Math.round(delta / Hour),
                unit: 'hours',
            };
        else if (delta < Week)
            return {
                number: Math.round(delta / Day),
                unit: 'days',
            };
        else
            return {
                number: Math.round(delta / Week),
                unit: 'weeks',
            };
    }
</script>

<section class="checkpoints">
    {#if project.getCheckpoints().length === 0}
        &mdash;
    {:else}
        <Button
            tip={$locales.get((l) => l.ui.checkpoints.button.clear)}
            action={() => {
                Projects.reviseProject(project.withoutHistory());
                return;
            }}>{CANCEL_SYMBOL}</Button
        >
        <Button
            tip={$locales.get((l) => l.ui.checkpoints.button.checkpoint)}
            action={() => {
                Projects.reviseProject(
                    project.withCheckpoint({
                        time: Date.now(),
                        sources: project.getSerializedSources(),
                    }),
                );
                return;
            }}><Emoji>📸</Emoji></Button
        >
        {#each project.getCheckpoints().reverse() as checkpoint}
            {@const delta = getDelta(checkpoint.time)}
            <Button
                tip={$locales.get((l) => l.ui.checkpoints.button.select)}
                action={() => {}}
            >
                <div class="checkpoint"
                    ><div class="number">{Math.abs(delta.number)}</div><div
                        class="unit">{delta.unit}</div
                    ></div
                ></Button
            >
        {/each}
    {/if}
</section>

<style>
    section {
        display: flex;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .checkpoint {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .number {
        font-size: var(--wordplay-small-font-size);
        font-style: italic;
    }

    .unit {
        font-size: calc(0.5 * var(--wordplay-small-font-size));
    }
</style>
