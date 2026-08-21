<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import {
        budget,
        subscribeTranslationBudget,
    } from '@db/translationBudget.svelte';

    interface Props {
        /** Render just the bar and a short line, for a tight space like a chat
         *  toolbar. */
        compact?: boolean;
    }

    let { compact = false }: Props = $props();

    const user = getUser();

    // Only creators who can see a translation surface carry a listener, and it
    // stops with the component. Because the server charges per chunk, this also
    // makes the meter fall while a translation is running.
    $effect(() => {
        const current = $user;
        if (!isAuthenticated(current)) return;
        return subscribeTranslationBudget(current.uid);
    });

    let percent = $derived(
        budget.limit > 0
            ? Math.min(100, Math.round((budget.used / budget.limit) * 100))
            : 0,
    );
    let spent = $derived(budget.used >= budget.limit);
    /** Whole minutes until the budget resets, or undefined until the server has
     *  said when that is. */
    let minutes = $derived(
        budget.resetsAt === undefined
            ? undefined
            : Math.max(1, Math.ceil((budget.resetsAt - Date.now()) / 60_000)),
    );
</script>

{#if isAuthenticated($user)}
    <div class="meter" class:compact>
        {#if spent && minutes !== undefined}
            <!-- A duration rather than a time of day: the reset follows the
                 creator's own midnight, and "in about 3 hours" says that
                 without ever showing them a time zone. -->
            <MarkupHTMLView
                inline
                markup={minutes >= 60
                    ? [
                          (l) => l.ui.translation.exhaustedHours,
                          { hours: `${Math.round(minutes / 60)}` },
                      ]
                    : [
                          (l) => l.ui.translation.exhaustedMinutes,
                          { minutes: `${minutes}` },
                      ]}
            />
        {:else}
            <MarkupHTMLView
                inline
                markup={[
                    (l) => l.ui.translation.used,
                    {
                        used: `${budget.used}`,
                        limit: `${budget.limit}`,
                    },
                ]}
            />
        {/if}
        <div
            class="track"
            class:spent
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={$locales.getPrimaryPlainText(
                (l) => l.ui.translation.meter,
            )}
        >
            <div class="used" style:width="{percent}%"></div>
        </div>
    </div>
{/if}

<style>
    .meter {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
        min-width: 12em;
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }

    .meter.compact {
        min-width: 8em;
    }

    .track {
        position: relative;
        overflow: hidden;
        width: 100%;
        height: var(--wordplay-focus-width);
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
    }

    .used {
        height: 100%;
        background: var(--wordplay-highlight-color);
    }

    /* The bar reinforces the state; the sentence above already says it, so
       nothing here depends on color alone. */
    .track.spent .used {
        background: var(--wordplay-error);
    }
</style>
