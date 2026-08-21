<script lang="ts">
    /**
     * A native <select> dropdown for choosing a locale. All candidates are
     * always visible — no typing required. The browser handles keyboard
     * navigation, search-by-letter, and announcing the selection to screen
     * readers natively. A decorative chevron is layered on top to match the
     * intended look; it never intercepts interaction.
     */
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { localeToString, type Locale } from '@locale/Locale';
    import {
        getLocaleRegionNames,
        getMultilingualLanguageLabel,
    } from '@locale/LocaleText';

    interface Props {
        /** A unique id wired to the underlying <select>. */
        id: string;
        /** The full candidate list shown as options. */
        candidates: Locale[];
        /** The currently chosen locale, as a locale string, if any. */
        selected: string | undefined;
        /** Accessible label for the dropdown. */
        label: LocaleTextAccessor;
        /** Called with the chosen locale string when the selection changes. */
        choose: (localeString: string) => void;
    }

    let { id, candidates, selected, label, choose }: Props = $props();

    let ariaLabel = $derived($locales.getPrimaryPlainText(label));

    /** Plain-text name for a locale — mirrors what LocaleName renders. */
    function optionText(locale: Locale): string {
        const names = getMultilingualLanguageLabel(locale);
        const regions = getLocaleRegionNames(locale);
        return regions.length > 0 ? `${names} (${regions.join('/')})` : names;
    }
</script>

<!--
    A plain <select> is the most accessible, searchable, and browsable
    dropdown: the browser exposes it natively to screen readers and provides
    keyboard search, scroll, and system-native open/close behaviour for free.
    The wrapper only positions the decorative chevron.
-->
<div class="locale-field">
    <select
        {id}
        class="locale-select"
        aria-label={ariaLabel}
        title={$locales.getPlainText(label)}
        value={selected ?? ''}
        onchange={(e) => {
            const v = (e.currentTarget as HTMLSelectElement).value;
            if (v) choose(v);
        }}
    >
        <!-- Placeholder shown only when nothing is selected yet. -->
        <option value="" disabled>{ariaLabel}</option>
        {#each candidates as locale}
            <option value={localeToString(locale)}>{optionText(locale)}</option>
        {/each}
    </select>
    <!-- Decorative chevron; the native select underneath owns all clicks. -->
    <svg
        class="chevron"
        viewBox="0 0 12 8"
        aria-hidden="true"
        focusable="false"
    >
        <path d="M1 1.5 L6 6.5 L11 1.5" />
    </svg>
</div>

<style>
    .locale-field {
        position: relative;
        display: inline-block;
        max-width: 16rem;
    }

    .locale-select {
        /* Remove the OS-native arrow so our chevron is the only one shown. */
        appearance: none;
        -webkit-appearance: none;

        width: 100%;
        min-height: max(var(--wordplay-widget-height), 24px);
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        font-weight: var(--wordplay-font-weight);
        line-height: 1;
        color: inherit;
        background: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        /* Reserve trailing space for the chevron. */
        padding-block: calc(0.5 * var(--wordplay-spacing-half));
        padding-inline: calc(0.75 * var(--wordplay-spacing));
        padding-inline-end: calc(2.5 * var(--wordplay-spacing));
        cursor: pointer;
    }

    .locale-select:focus {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: var(--wordplay-focus-width);
    }

    .locale-select option[value=''] {
        color: var(--wordplay-inactive-color);
    }

    .chevron {
        position: absolute;
        inset-inline-end: calc(0.8 * var(--wordplay-spacing));
        top: 50%;
        width: 0.7rem;
        height: 0.5rem;
        transform: translateY(-50%);
        /* Clicks fall through to the select underneath. */
        pointer-events: none;
        /* Follow the current text/theme colour. */
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
    }
</style>
