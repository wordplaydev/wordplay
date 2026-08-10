<script lang="ts">
    /**
     * An accessible combobox for choosing a language/locale from a searchable
     * list. Implements the ARIA 1.2 "combobox with list autocomplete" pattern:
     * a text input owns keyboard focus and exposes the filtered list via
     * `aria-controls`/`aria-expanded`, while a virtual focus
     * (`aria-activedescendant`) moves through the `role="option"` items with the
     * arrow keys. Selection is conveyed non-visually with `aria-selected`, and
     * the number of matches is announced through the centralized Announcer so it
     * isn't signaled by the highlight color alone.
     */
    import { getAnnouncer } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import {
        localeToString,
        localesAreEqual,
        stringToLocale,
        type Locale,
    } from '@locale/Locale';
    import { tick } from 'svelte';
    import LocaleName from './LocaleName.svelte';
    import { filterLocalesByQuery } from './LocaleSearch.svelte';

    interface Props {
        /** A unique id, used to derive the input, listbox, and option ids. */
        id: string;
        /** The full, de-duplicated candidate list to filter. */
        candidates: Locale[];
        /** The currently chosen locale, as a locale string, if any. */
        selected: string | undefined;
        /** The accessible label for the combobox input. */
        label: LocaleTextAccessor;
        /** Called with the chosen locale string when an option is selected. */
        choose: (localeString: string) => void;
    }

    let { id, candidates, selected, label, choose }: Props = $props();

    let query = $state('');
    let listView = $state<HTMLUListElement | undefined>();
    /** Index of the option holding the virtual focus, or -1 when none. */
    let activeIndex = $state(-1);

    const announce = getAnnouncer();

    let filtered = $derived(
        filterLocalesByQuery(
            candidates,
            query,
            (locale) => locale,
            $locales.getLanguages(),
        ),
    );

    /** The listbox is shown only once the creator has typed something. */
    let expanded = $derived(query.trim() !== '');

    let inputLabel = $derived($locales.getPrimaryPlainText(label));

    function isSelected(locale: Locale): boolean {
        if (selected === undefined) return false;
        const chosen = stringToLocale(selected);
        return chosen !== undefined && localesAreEqual(chosen, locale);
    }

    function optionId(index: number): string {
        return `${id}-option-${index}`;
    }

    function pick(locale: Locale) {
        choose(localeToString(locale));
        query = '';
        activeIndex = -1;
    }

    // Keep the virtual focus within the filtered list, defaulting to the
    // selected option (or the first) whenever the list changes.
    $effect(() => {
        // Re-run when the filtered list changes.
        filtered;
        if (!expanded) {
            activeIndex = -1;
            return;
        }
        if (activeIndex >= filtered.length || activeIndex < 0) {
            const selectedIndex = filtered.findIndex((l) => isSelected(l));
            activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
        }
    });

    // Announce the number of matches so it isn't conveyed by the highlight
    // color alone. The count varies as the creator types, so consecutive
    // identical counts are the only ones the queue dedupes.
    let lastAnnouncedCount = $state<number | undefined>();
    $effect(() => {
        if (!expanded) {
            lastAnnouncedCount = undefined;
            return;
        }
        const count = filtered.length;
        if (count === lastAnnouncedCount) return;
        lastAnnouncedCount = count;
        if (announce && $announce)
            $announce(
                'selection',
                $locales.getLanguages()[0],
                $locales
                    .concretize((l) => l.ui.collaborate.translate.results, {
                        count,
                    })
                    .toText(),
            );
    });

    // Scroll the active option into view as the virtual focus moves.
    $effect(() => {
        const active = activeIndex;
        if (!expanded || active < 0) return;
        tick().then(() => {
            listView
                ?.querySelector(`#${CSS.escape(optionId(active))}`)
                ?.scrollIntoView({ block: 'nearest' });
        });
    });

    function handleKeyDown(event: KeyboardEvent) {
        if (!expanded) {
            // Let the first arrow-down reveal the list once there's a query.
            if (event.key === 'ArrowDown' && query.trim() !== '') {
                activeIndex = 0;
                event.preventDefault();
            }
            return;
        }
        switch (event.key) {
            case 'ArrowDown':
                activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
                event.preventDefault();
                break;
            case 'ArrowUp':
                activeIndex = Math.max(activeIndex - 1, 0);
                event.preventDefault();
                break;
            case 'Home':
                activeIndex = 0;
                event.preventDefault();
                break;
            case 'End':
                activeIndex = filtered.length - 1;
                event.preventDefault();
                break;
            case 'Enter':
                if (activeIndex >= 0 && activeIndex < filtered.length) {
                    pick(filtered[activeIndex]);
                    event.preventDefault();
                }
                break;
            case 'Escape':
                if (query !== '') {
                    query = '';
                    activeIndex = -1;
                    event.preventDefault();
                }
                break;
        }
    }
</script>

<div class="locale-combobox">
    <!-- The input is the combobox: it owns focus and exposes the popup. -->
    <input
        {id}
        class="search"
        type="text"
        role="combobox"
        aria-label={inputLabel}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls="{id}-listbox"
        aria-activedescendant={expanded && activeIndex >= 0
            ? optionId(activeIndex)
            : undefined}
        bind:value={query}
        onkeydown={handleKeyDown}
    />
    <!--
        The listbox stays in the DOM so `aria-controls` always resolves; it is
        emptied and collapsed (aria-expanded=false on the input) when there is
        no query. Options are chosen via the input's virtual focus, so they
        carry no key handlers of their own — the combobox pattern routes all
        keyboard interaction through the input above.
    -->
    <ul
        bind:this={listView}
        id="{id}-listbox"
        class="locale-options"
        role="listbox"
        aria-label={inputLabel}
        hidden={!expanded}
    >
        {#if expanded}
            {#each filtered as locale, index}
                {@const ls = localeToString(locale)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- Keyboard interaction is handled on the combobox input via
                     aria-activedescendant, per the ARIA combobox pattern; the
                     option itself is not a keyboard tab stop. -->
                <li
                    id={optionId(index)}
                    class="option"
                    class:selected={isSelected(locale)}
                    class:active={index === activeIndex}
                    role="option"
                    aria-selected={isSelected(locale)}
                    onpointerdown={(event) => {
                        // Keep focus on the input (don't let the option steal it).
                        event.preventDefault();
                        pick(locale);
                    }}
                >
                    <LocaleName locale={ls} supported showDraft={false} />
                </li>
            {:else}
                <li class="empty" role="presentation">&mdash;</li>
            {/each}
        {/if}
    </ul>
</div>

<style>
    .locale-combobox {
        display: contents;
    }

    .search {
        font-family: inherit;
        font-size: inherit;
        color: inherit;
        background: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: calc(0.5 * var(--wordplay-spacing));
    }

    .search:focus {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: var(--wordplay-focus-width);
    }

    .locale-options {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: var(--wordplay-spacing);
        padding-block: var(--wordplay-spacing);
        margin: 0;
        max-height: 8rem;
        overflow-y: auto;
        flex-shrink: 0;
        list-style: none;
    }

    .locale-options[hidden] {
        display: none;
    }

    .option {
        border: var(--wordplay-focus-width) solid transparent;
        border-radius: var(--wordplay-border-radius);
        padding: calc(0.25 * var(--wordplay-spacing));
        cursor: pointer;
    }

    /* Selection is also exposed via aria-selected; this is the visual echo. */
    .option.selected {
        border-color: var(--wordplay-focus-color);
    }

    /* The virtual focus (aria-activedescendant) highlight. */
    .option.active {
        background: var(--wordplay-highlight-color);
    }

    .empty {
        list-style: none;
        opacity: 0.6;
    }
</style>
