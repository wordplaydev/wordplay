<script module lang="ts">
    const Minute = 60 * 1000;
    const Hour = 60 * Minute;
    const Day = 24 * Hour;
    const Week = 7 * Day;
</script>

<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Projects } from '@db/projects/Projects';
    import type Project from '@db/projects/Project';
    import {
        getCheckpoint,
        getCheckpointIndex,
        getCheckpointOrder,
        stepCheckpoint,
        type CheckpointAnchor,
    } from '@components/project/checkpoints';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { onMount } from 'svelte';
    import { withMonoEmoji } from '@unicode/emoji';

    let {
        project,
        // The time of the checkpoint being viewed, or null for now. Anchored on
        // time rather than position because the list shifts underneath a
        // browsing creator; see checkpoints.ts.
        checkpoint = $bindable(null),
    }: { project: Project; checkpoint: CheckpointAnchor } = $props();

    let history = $derived(getCheckpointOrder(project.getCheckpoints()));
    let index = $derived(
        getCheckpointIndex(project.getCheckpoints(), checkpoint),
    );
    let current = $derived(getCheckpoint(project.getCheckpoints(), checkpoint));

    let now = $state(Date.now());
    onMount(() => {
        const timeout = setInterval(() => (now = Date.now()), 1000);
        return () => clearInterval(timeout);
    });

    function getDelta(time: number): { number: number; unit: string } {
        const delta = now - time;
        if (delta < Minute)
            return {
                number: Math.round(delta / 1000),
                unit: 's',
            };
        else if (delta < Hour)
            return { number: Math.round(delta / Minute), unit: 'min' };
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
    {withMonoEmoji('🕐')}
    <LocalizedText path={(l) => l.ui.checkpoints.label.history} />
    <Button
        background
        tip={(l) => l.ui.checkpoints.button.checkpoint}
        action={() => {
            Projects.reviseProject(project.withCheckpoint());
            return;
        }}
        icon="📸"
    ></Button>
    {#if project.getCheckpoints().length === 0}
        &mdash;
    {:else}
        <ConfirmButton
            background
            tip={(l) => l.ui.checkpoints.button.clear}
            prompt={(l) => l.ui.checkpoints.button.clear}
            action={() => {
                // Return to now before the history goes away, so nothing
                // renders against an anchor that no longer resolves.
                checkpoint = null;
                Projects.reviseProject(project.withoutHistory());
                return;
            }}>{CANCEL_SYMBOL}</ConfirmButton
        >
        <Button
            background
            tip={(l) => l.ui.checkpoints.button.back}
            active={index < history.length - 1}
            action={() => {
                checkpoint = stepCheckpoint(
                    project.getCheckpoints(),
                    checkpoint,
                    1,
                );
                return;
            }}
            icon="⏴"
        ></Button>
        <Button
            background
            tip={(l) => l.ui.checkpoints.button.forward}
            active={index > -1}
            action={() => {
                checkpoint = stepCheckpoint(
                    project.getCheckpoints(),
                    checkpoint,
                    -1,
                );
                return;
            }}
            icon="⏵"
        ></Button>
        <Button
            background
            tip={(l) => l.ui.checkpoints.button.now}
            active={index > -1}
            action={() => {
                checkpoint = null;
                return;
            }}
            icon="⏵⏵"
        ></Button>
        <span class="checkpoint">
            {#if current === undefined}
                <LocalizedText path={(l) => l.ui.checkpoints.label.now} />
                <span class="time"> / {history.length}</span>
            {:else}
                {@const duration = getDelta(current.time)}
                {index + 1}/{history.length}
                <span class="time"
                    ><MarkupHTMLView
                        inline
                        markup={[
                            (l) => l.ui.checkpoints.label.ago,
                            { amount: duration.number, unit: duration.unit },
                        ]}
                    /></span
                >
            {/if}
        </span>
    {/if}
</section>

<style>
    section {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .time {
        font-size: var(--wordplay-small-font-size);
    }
</style>
