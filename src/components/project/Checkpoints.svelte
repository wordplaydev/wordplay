<script module lang="ts">
    const Minute = 60 * 1000;
    const Hour = 60 * Minute;
    const Day = 24 * Hour;
    const Week = 7 * Day;

    export type CheckpointsText = {
        label: {
            now: string;
            history: string;
            restore: string;
            ago: Template;
        };
        button: {
            clear: string;
            select: string;
            checkpoint: string;
            back: string;
            forward: string;
            restore: string;
            now: string;
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
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import { docToMarkup, type Template } from '@locale/LocaleText';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';

    let {
        project,
        // -1 represents nothing choice, 0-N represents the index into the checkpoint history
        checkpoint = $bindable(-1),
    }: { project: Project; checkpoint: number } = $props();

    let history = $derived(project.getCheckpoints().toReversed());

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
    🕐
    {$locales.get((l) => l.ui.checkpoints.label.history)}
    <Button
        tip={$locales.get((l) => l.ui.checkpoints.button.checkpoint)}
        action={() => {
            Projects.reviseProject(project.withCheckpoint());
            return;
        }}><Emoji>📸</Emoji></Button
    >
    {#if project.getCheckpoints().length === 0}
        &mdash;
    {:else}
        <ConfirmButton
            tip={$locales.get((l) => l.ui.checkpoints.button.clear)}
            prompt={$locales.get((l) => l.ui.checkpoints.button.clear)}
            action={() => {
                Projects.reviseProject(project.withoutHistory());
                checkpoint = -1;
                return;
            }}>{CANCEL_SYMBOL}</ConfirmButton
        >
        <Button
            tip={$locales.get((l) => l.ui.checkpoints.button.forward)}
            active={checkpoint < history.length - 1}
            action={() => {
                checkpoint++;
                return;
            }}><Emoji>⏴</Emoji></Button
        >
        <Button
            tip={$locales.get((l) => l.ui.checkpoints.button.back)}
            active={checkpoint > -1}
            action={() => {
                checkpoint--;
                return;
            }}><Emoji>⏵</Emoji></Button
        >
        <Button
            tip={$locales.get((l) => l.ui.checkpoints.button.now)}
            active={checkpoint > -1}
            action={() => {
                checkpoint = -1;
                return;
            }}><Emoji>⏵⏵</Emoji></Button
        >
        <span class="checkpoint">
            {#if checkpoint === -1}
                {$locales.get((l) => l.ui.checkpoints.label.now)}
                <span class="time"> / {history.length}</span>
            {:else}
                {@const duration = getDelta(history[checkpoint].time)}
                {checkpoint + 1}/{history.length}
                <span class="time"
                    ><MarkupHtmlView
                        inline
                        markup={docToMarkup(
                            $locales.get((l) => l.ui.checkpoints.label.ago),
                        ).concretize($locales, [
                            duration.number,
                            duration.unit,
                        ]) ?? ''}
                    /></span
                >
            {/if}
        </span>
    {/if}
</section>

<style>
    section {
        display: flex;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
        white-space: nowrap;
    }

    .time {
        font-size: var(--wordplay-small-font-size);
    }
</style>
