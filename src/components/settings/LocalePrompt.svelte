<script lang="ts">
    /**
     * Greets a visitor who has never chosen a language (#1256).
     *
     * The app boots in English for everyone, so someone who can't read English sees an
     * English page with no way to know that the English word in the footer is the way
     * out. This wraps the ordinary chooser in an invitation written in every language
     * we support, so the way out is legible whoever is reading.
     *
     * A wrapper rather than part of LocaleChooser so that the phrase table and this
     * rotation load with the prompt, not with every page that mounts the chooser in
     * its footer.
     */
    import Header from '@components/app/Header.svelte';
    import LocaleChooser from '@components/settings/LocaleChooser.svelte';
    import { animationFactor } from '@db/Database';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import { ChoosePrompts } from '@locale/choosePrompts.generated';
    import { getBestSupportedLocales } from '@locale/getBestSupportedLocales';
    import { getLocaleLanguage } from '@locale/LocaleText';

    interface Props {
        show?: boolean;
    }

    let { show = $bindable(true) }: Props = $props();

    /** Every locale's invitation to choose a language. From a table built at build time,
     *  not from `$locales`: only en-US is bundled, so reading thirty locales' text here
     *  would mean thirty fetches before the visitor could read anything. */
    const phrases = Object.entries(ChoosePrompts).map(([locale, phrase]) => ({
        locale,
        phrase,
        language: getLocaleLanguage(locale) ?? 'en',
    }));

    /** What to lead with when nothing is rotating: whatever the browser says the reader
     *  prefers, so a still header still speaks to them. */
    const preferred =
        phrases.find(
            (entry) =>
                entry.locale ===
                getBestSupportedLocales(
                    typeof navigator === 'undefined'
                        ? []
                        : [...navigator.languages],
                )[0],
        ) ??
        phrases.find((entry) => entry.locale === 'en-US') ??
        phrases[0];

    let index = $state(0);
    let holding = $state(false);

    /** Rotate the header so a reader of any language sees their own within a few
     *  seconds. No timer at all when motion is off, and paused while pointed at or
     *  tabbed into — the same contract as the landing page's rotating label. */
    $effect(() => {
        if (holding || $animationFactor <= 0) return;
        const period = Math.max(1500, 4000 * $animationFactor);
        const cycler = setInterval(
            () => (index = (index + 1) % phrases.length),
            period,
        );
        return () => clearInterval(cycler);
    });

    let rotating = $derived(
        $animationFactor <= 0 ? preferred : (phrases[index] ?? preferred),
    );
</script>

<LocaleChooser prompt showButton={false} bind:show>
    {#snippet banner()}
        <!-- Hovering or tabbing in holds the rotation still, so nobody loses the phrase
             they were reading. Purely a pause for pointer users; keyboard users get the
             same from focus, and the phrase list below never moves. -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="prompt"
            onpointerenter={() => (holding = true)}
            onpointerleave={() => (holding = false)}
            onfocusin={() => (holding = true)}
            onfocusout={() => (holding = false)}
        >
            {#if rotating}
                <Header
                    ><span
                        lang={rotating.language}
                        dir={getLanguageDirection(rotating.language)}
                        >{rotating.phrase}</span
                    ></Header
                >
            {/if}
            <div class="phrases">
                {#each phrases as entry (entry.locale)}
                    <span
                        class="phrase"
                        lang={entry.language}
                        dir={getLanguageDirection(entry.language)}
                        >{entry.phrase}</span
                    >
                {/each}
            </div>
        </div>
    {/snippet}
</LocaleChooser>

<style>
    .prompt {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    /* Wrapped inline rather than stacked: thirty phrases in a column would push the
       languages themselves off the first screen, which is what the visitor is here
       to pick. */
    .phrases {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing-half);
        opacity: 0.7;
        font-size: small;
    }

    .phrase:not(:last-child)::after {
        content: ' ·';
    }
</style>
