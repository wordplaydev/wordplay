<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { Settings } from '@db/Database';
    import Header from '../../components/app/Header.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
    import updates from './updates.json';

    // Get the dated updates in reverse chronological order.
    const datedUpdates = updates
        .filter((update) => update.date !== null)
        .map((update) => ({
            ...update,
            // Add a time zone to ensure consistent sorting regardless of the user's locale.
            date: update.date + 'T00:00:00',
        }))
        .toSorted((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

    let collapsed = $state<boolean[]>(
        datedUpdates.map((_, index) => index > 1),
    );

    Settings.setUpdatesLastChecked(datedUpdates[0].date.split('T')[0]);
</script>

{#snippet note(text: string)}
    <!-- Convert markdown into Wordplay markup -->
    <li
        ><MarkupHTMLView
            markup={text
                .replaceAll('**', '*')
                .replaceAll('_', '/')
                .replaceAll(/`(.+?)`/g, '\\"$1"\\')
                .replaceAll(
                    /#([0-9]+)/g,
                    '<$1@https://github.com/wordplaydev/wordplay/issues/$1>',
                )}
        />
    </li>
{/snippet}

<Writing>
    <Header text={(l) => l.ui.page.updates.header}></Header>
    <MarkupHTMLView markup={(l) => l.ui.page.updates.content} />

    {#each datedUpdates as update, index}
        <div class="section">
            <Subheader>
                {new Date(update.date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })}
                <Button
                    background
                    tip={collapsed[index]
                        ? (l) => l.ui.page.updates.tips.expand
                        : (l) => l.ui.page.updates.tips.collapse}
                    action={() => (collapsed[index] = !collapsed[index])}
                    >{#if collapsed[index]}+{:else}-{/if}</Button
                ></Subheader
            >

            {#if !collapsed[index]}
                {#if update.changes.added.length > 0}
                    <h3 class="added"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.added}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.added as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                {/if}
                {#if update.changes.fixed.length > 0}
                    <h3 class="fixed"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.fixed}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.fixed as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                {/if}
                {#if update.changes.removed.length > 0}
                    <h3 class="removed"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.removed}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.removed as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                {/if}
                {#if update.changes.changed.length > 0}
                    <h3 class="changed"
                        ><LocalizedText
                            path={(l) => l.ui.page.updates.categories.changed}
                        ></LocalizedText></h3
                    >
                    <ul>
                        {#each update.changes.changed as item}
                            {@render note(item)}
                        {/each}
                    </ul>
                {/if}
            {/if}
        </div>
    {/each}
</Writing>

<style>
    .section {
        margin-top: 3em;
    }

    h3 {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        color: var(--wordplay-background);
        display: inline-block;
        font-weight: bold;
    }

    h3.added {
        background: var(--wordplay-focus-color);
    }

    h3.changed {
        background: var(--wordplay-evaluation-color);
    }
    h3.removed {
        background: var(--wordplay-warning);
    }
    h3.fixed {
        background: var(--wordplay-error);
    }
</style>
