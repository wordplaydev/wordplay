<script lang="ts">
    import Notice from '@components/app/Notice.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { locales } from '@db/Database';
    import type { ImportProblem } from '@db/projects/importProject';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        /** Handed the text of a chosen file. Reporting the outcome is the
         *  caller's, since what an import means differs between adding to a
         *  list and replacing an open project. */
        choose: (text: string, name: string) => Promise<void>;
        /** Whether the control can be used yet — the projects page waits for
         *  auth so an import isn't filed under the wrong owner. */
        ready?: boolean;
    }

    let { choose, ready = true }: Props = $props();

    let picker: HTMLInputElement | undefined = $state(undefined);
    let problem: ImportProblem | 'unreadable-file' | undefined =
        $state(undefined);
    let reading = $state(false);

    /** Reports a failure this component owns — one that happens before the
     *  caller ever sees any text. */
    export function fail(what: ImportProblem) {
        problem = what;
    }

    /** Clears whatever the last attempt said, so a new one starts clean. */
    export function reset() {
        problem = undefined;
    }

    async function chosen() {
        const file = picker?.files?.[0];
        if (file === undefined) return;
        problem = undefined;
        reading = true;
        try {
            await choose(await file.text(), file.name);
        } catch {
            // A file the browser could not read at all — removed from the
            // drive mid-pick, or a permission the OS withdrew.
            problem = 'unreadable-file';
        } finally {
            reading = false;
            // Without this, choosing the same file again fires no `change`
            // event, so a creator who fixes a file and retries gets silence.
            if (picker) picker.value = '';
        }
    }

    const explanation: Record<string, LocaleTextAccessor> = {
        empty: (l) => l.ui.page.projects.error.importEmpty,
        'too-large': (l) => l.ui.page.projects.error.importTooLarge,
        unreadable: (l) => l.ui.page.projects.error.importUnreadable,
        'unreadable-file': (l) => l.ui.page.projects.error.importUnreadable,
    };
</script>

<!-- The real input is off-screen rather than `display: none`, so it stays
     focusable for anyone driving the page with a screen reader that reaches
     inputs directly. The button below is what everyone else presses. -->
<input
    type="file"
    accept=".wp,text/plain"
    bind:this={picker}
    onchange={chosen}
    aria-label={$locales.getPrimaryPlainText(
        (l) => l.ui.page.projects.button.import.tip,
    )}
/>
<Button
    background
    tip={(l) => l.ui.page.projects.button.import.tip}
    action={() => picker?.click()}
    active={ready && !reading}
    label={(l) => l.ui.page.projects.button.import.label}
    testid="import-project"
/>
{#if problem}
    {@const why = explanation[problem]}
    {#if why}<Notice text={why} />{/if}
{/if}

<style>
    input[type='file'] {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
    }
</style>
