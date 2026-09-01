<script lang="ts" module>
    /** The Unicode categories we make visible, in the order they should appear/
     * The emoji subcategories aren't part of the standard; they are shorthand for the
     * categories with the corresponding emoji group. See src/unicode/emoji.ts for more details.
     */
    export const VisibleCategories = [
        'Custom', // Custom characters
        'So-sm', // Other Symbol - Smileys & People
        'So-pe', // Other Symbol - Animals & Nature
        'So-an', // Other Symbol - Food & Drink
        'So-fo', // Other Symbol - Vehicles & Transportation
        'So-tr', // Other Symbol - Activities
        'So-ac', // Other Symbol - Flags
        'So-ob', // Other Symbol - Objects
        'So-sy', // Other Symbol - Symbols
        'So-fl', // Other Symbol - Flags
        'Ll', // Letter, Lowercase
        'Lu', // Letter, Uppercase
        'Sm', // Mathematical Symbol
        'Shapes', // Shape ranges 2500-257F, 2580-259F, 25A0-25FF, 1F780-1F7FF
        'Arrows', // Arrow ranges2190-21FF, 27F0-27FF, 2900-297F, 2B00-2BFF, 1F800-1F8FF
        'Nd', // Number, Decimal Digit
        'Nl', // Number, Letter,
        'Sc', // Currency Symbol,
        'Search', // Search results; only shown while a query is active
    ] as const;

    /** The index of the search tab, which is only shown while searching. It's
     *  last so every other category keeps its index, and with it its position
     *  in the locales' positional label and tip arrays. */
    export const SearchCategoryIndex = VisibleCategories.indexOf('Search');

    /** The Unicode ranges for the "Shape" category */
    const Shapes = [
        [0x2500, 0x257f],
        [0x2580, 0x259f],
        [0x25a0, 0x25ff],
        [0x1f780, 0x1f7ff],
    ];

    /** The Unicode ranges for the "Arrows" category*/
    const Arrows = [
        [0x2190, 0x21ff],
        [0x27f0, 0x27ff],
        [0x2900, 0x297f],
        [0x2b00, 0x2bff],
        [0x1f800, 0x1f8ff],
    ];

    /** Fitzpatrick skin tone modifier codepoints (U+1F3FB–U+1F3FF) */
    const SkinToneModifiers = [0x1f3fb, 0x1f3fc, 0x1f3fd, 0x1f3fe, 0x1f3ff];

    /** True if the codepoint is a Fitzpatrick skin tone modifier */
    function isSkinToneModifier(cp: number): boolean {
        return cp >= 0x1f3fb && cp <= 0x1f3ff;
    }

    /** True if the hex array contains a Fitzpatrick skin tone modifier */
    function hasSkinToneModifier(hex: number[]): boolean {
        return hex.some(isSkinToneModifier);
    }

    /** Cap on how many language names to spell out under a script-filter
     *  option before collapsing the rest into an "and N more" suffix.
     *  Latin alone covers dozens; without a cap the dropdown bloats. */
    export const MaxScriptLanguages = 7;
</script>

<script lang="ts">
    import {
        isCodepointRenderable,
        loadRenderableRanges,
    } from '@basis/faces/renderable';
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Options, { type Option } from '@components/widgets/Options.svelte';
    import Tabbed from '@components/widgets/Tabbed.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { characterToSVG, type Character } from '@db/characters/Character';
    import { buildCharacterSearch } from '@db/characters/characterSearch';
    import { CharactersDB, Locales, locales } from '@db/Database';
    import {
        getLanguagesForScript,
        getScriptSpeakers,
    } from '@locale/LanguageCode';
    import { toLocaleString } from '@locale/LocaleText';
    import { Scripts, type Script } from '@locale/Scripts';
    import type { SupportedLocale } from '@locale/SupportedLocales';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { withColorEmoji, withMonoEmoji } from '@unicode/emoji';
    import { localizedGlyphName } from '@unicode/glyphName';
    import { buildGlyphSearch } from '@unicode/glyphSearch';
    import {
        getCodepoints,
        getGlyphNames,
        type Codepoint,
    } from '@unicode/Unicode';
    import { debounced } from '@util/debounce.svelte';
    import { searchItems } from '@util/search';
    import { onMount } from 'svelte';

    const emojiMaps = Locales.emojis;

    interface Props {
        /** Callback for when a glyph is chosen */
        pick: (glyph: string) => void;
        /** The currently selected glyph; if provided, it will be highlighted.  */
        glyph?: string | undefined;
        /** Whether to show custom characters*/
        showCustom?: boolean;
        /**
         * When provided, the search box is hidden and this value is used as the
         * query instead, letting a parent component control the search.
         */
        externalQuery?: string | undefined;
        /** Called when choosing a tab should abandon the search. Required for
         *  `externalQuery` callers, since only they can clear their query. */
        clearQuery?: () => void;
        /** Whether to offer a color/monochrome choice, which decides the
         *  presentation selector a picked emoji carries and how the grid
         *  previews it. Off for callers whose glyph becomes a symbol or a name,
         *  where presentation means nothing (and is stripped by NameToken). */
        choosePresentation?: boolean;
    }

    let {
        pick,
        glyph = undefined,
        showCustom = true,
        externalQuery = undefined,
        clearQuery = undefined,
        choosePresentation = false,
    }: Props = $props();

    /** Which presentation a picked emoji asks for. Color matches how every
     *  emoji rendered before the choice existed. */
    let presentation = $state<'color' | 'mono'>('color');

    /** The glyph as it should be inserted: an emoji carries the chosen
     *  presentation selector, everything else is handed over untouched. */
    function withPresentation(glyph: string): string {
        return !choosePresentation
            ? glyph
            : presentation === 'mono'
              ? withMonoEmoji(glyph)
              : withColorEmoji(glyph);
    }

    /** The characters the creator can edit, the corpus for character search.
     *  Broader than the Custom tab's list, so a private or collaborated
     *  character is findable by name even though it isn't browsable. */
    let editableCharacters = $derived(CharactersDB.getEditableCharacters());

    let publicCharacters = $derived(editableCharacters.filter((c) => c.public));

    /** One of VisibleCategories, or undefined when a script filter is active
     *  (the category tabs and the script dropdown are mutually exclusive). */
    let category = $state<(typeof VisibleCategories)[number] | undefined>(
        'So-sm',
    );

    /** The Unicode codepoints metadata, loaded async on mount */
    let codepoints = $state<Codepoint[] | null>(null);

    /** English names/keywords for non-emoji glyphs (search + tooltips),
     * loaded async on mount. */
    let glyphNames = $state<Map<string, string[]> | null>(null);

    /** The ISO 15924 script filter, or undefined for no script filter. */
    let script = $state<string | undefined>(undefined);

    /** The internal search query, used when no externalQuery is provided */
    let internalQuery = $state('');

    /** The active query: external when provided, otherwise internal */
    let query = $derived(
        externalQuery !== undefined ? externalQuery : internalQuery,
    );

    /** Whether the query is long enough to search. Drives the results view, the
     *  browse view, and the search tab together, so they can't disagree. */
    let searching = $derived(query.length > 2);

    /** The selected skin tone modifier codepoint as a string, or undefined for the default (no modifier) */
    let skinTone = $state<string | undefined>(undefined);

    /** Options for the skin tone selector */
    const skinToneOptions: Option[] = [
        { value: undefined, label: '🟡' },
        ...SkinToneModifiers.map((cp) => ({
            value: String(cp),
            label: String.fromCodePoint(cp),
        })),
    ];

    /** Set of hex keys (comma-joined codepoints) for base emojis that have at least one skin tone variant */
    let skinToneEligibleCodepoints = $derived<Set<string>>(
        codepoints === null
            ? new Set()
            : new Set(
                  codepoints
                      .filter((c) => hasSkinToneModifier(c.hex))
                      .map((c) =>
                          // Remove the skin tone modifier from the hex array to get the base emoji, and join with commas to get the key
                          c.hex
                              .filter((cp) => !isSkinToneModifier(cp))
                              .join(','),
                      ),
              ),
    );

    /** Load the codepoints on mount */
    onMount(() => {
        // Load the renderable-ranges table (lazy — see renderable.ts) together
        // with the codepoints, so isCodepointRenderable has its data before the
        // grid (gated on `codepoints`) renders.
        Promise.all([getCodepoints(), loadRenderableRanges()]).then(([cp]) => {
            codepoints = cp;
        });
        // Load English names for non-emoji glyphs (Han, letters, symbols) so
        // they're searchable and tooltipped.
        getGlyphNames().then((names) => {
            glyphNames = names;
        });
        // Kick off emoji-translation loading for the currently selected
        // locales so cross-language search works without blocking the
        // picker. New translations will arrive via the emojiMaps store.
        Locales.loadEmojisForCurrentLocales();
    });

    /** Type guard so `Scripts[iso]` indexes safely without an `as` cast. */
    function isKnownScript(iso: string): iso is Script {
        return Object.hasOwn(Scripts, iso);
    }

    /** Resolve an ISO 15924 code to its display label, falling back to the
     *  raw code if Scripts hasn't catalogued it (shouldn't happen now that
     *  Scripts covers every code Unicode assigns, but the fallback keeps
     *  the picker functional if a future Unicode version adds one). */
    function scriptLabel(iso: string): string {
        if (isKnownScript(iso)) return Scripts[iso].name;
        return iso;
    }

    /** ISO 15924 codes present in the loaded codepoints, sorted by total
     *  speaker count of languages using each script (descending), with the
     *  display label as the alphabetical tiebreaker. The dropdown only
     *  lists scripts that actually have at least one pickable codepoint. */
    let availableScripts = $derived<string[]>(
        codepoints === null
            ? []
            : Array.from(
                  new Set(
                      codepoints
                          // Only scripts with at least one renderable single
                          // codepoint; a script whose glyphs no bundled font
                          // covers would otherwise show an all-tofu grid.
                          .filter(
                              (c) =>
                                  c.script !== undefined &&
                                  c.hex.length === 1 &&
                                  isCodepointRenderable(c.hex[0]),
                          )
                          .map((c) => c.script)
                          .filter((s): s is string => s !== undefined),
                  ),
              ).sort((a, b) => {
                  const speakerDelta =
                      getScriptSpeakers(b) - getScriptSpeakers(a);
                  if (speakerDelta !== 0) return speakerDelta;
                  return scriptLabel(a).localeCompare(scriptLabel(b));
              }),
    );

    /** The supported-locale codes for the currently selected locales, used
     * to look up emoji translations in the emojiMaps store. */
    let selectedLocaleCodes = $derived(
        $locales.getLocales().map((l) => toLocaleString(l) as SupportedLocale),
    );

    /** When the user switches locales, fetch any newly-needed emoji maps. */
    $effect(() => {
        for (const code of selectedLocaleCodes) Locales.loadEmojis(code);
    });

    /** Map an emoji group string to its visible category index. Used to search, as the tooltips are where the text is stored. */
    function getEmojiGroupIndex(group: string) {
        return VisibleCategories.findIndex((cat) => cat.endsWith(`-${group}`));
    }

    /** Display name for a codepoint. The rule lives in
     * {@link localizedGlyphName} so a reaction pill elsewhere can name its
     * emoji the same way. */
    function localizedNameFor(hex: number[]): string {
        return localizedGlyphName(
            hex,
            selectedLocaleCodes,
            $emojiMaps,
            glyphNames,
        );
    }

    /** A debounced copy of the query, so search runs after typing settles. */
    const debouncedQuery = debounced(() => query);

    /** Precomputed searchable records, rebuilt when codepoints, selected
     * locales, or their emoji translations change (not per keystroke). Search
     * relies entirely on localized emoji translations and the emoji-group label
     * text from the active locale; codes.txt no longer carries English names. */
    let searchRecords = $derived.by(() => {
        if (codepoints === null) return [];
        const maps = $emojiMaps;
        const groupTips = $locales.getTextStructure(
            (l) => l.ui.emoji.groups.tips,
        );
        return buildGlyphSearch(
            codepoints,
            selectedLocaleCodes,
            maps,
            (code) =>
                code.emoji
                    ? groupTips[getEmojiGroupIndex(code.emoji.group)]
                    : undefined,
            $locales.getLanguages(),
            glyphNames ?? undefined,
        );
    });

    /** Searchable records for the creator's characters, by name and description. */
    let characterRecords = $derived(
        buildCharacterSearch(editableCharacters, $locales.getLanguages()),
    );

    /** The matched characters for the current query. Searched separately from
     *  glyphs (rather than as one corpus) because the two have no comparable
     *  ranking; character matches are the more specific hit, so they render
     *  first. */
    let characterResults = $derived.by(() => {
        if (debouncedQuery.current.length < 3) return [];
        return searchItems(
            characterRecords,
            debouncedQuery.current,
            $locales.getLanguages(),
        ).map(([character]) => character);
    });

    /** The matched codepoints for the current query. Search is global — it
     * ignores the active script/category filter so a query finds matches
     * anywhere (e.g. "river" finds emoji even while a script is selected).
     * Emoji sort first (they're the most recognizable to most creators),
     * preserving the search ranking within each group. */
    let results = $derived.by(() => {
        if (debouncedQuery.current.length < 3 || codepoints === null) return [];
        return (
            searchItems(
                searchRecords,
                debouncedQuery.current,
                $locales.getLanguages(),
            )
                .map(([code]) => code)
                // Hide non-emoji glyphs no bundled font can draw.
                .filter(
                    (code) =>
                        code.emoji !== undefined ||
                        code.hex.every(isCodepointRenderable),
                )
                // Emoji first; stable, so search rank is preserved within.
                .sort((a, b) => (a.emoji ? 0 : 1) - (b.emoji ? 0 : 1))
        );
    });

    /** Cap on how many glyphs a browse grid renders. codes.txt enumerates tens
     * of thousands of codepoints (CJK, Hangul, …); rendering that many spans
     * would freeze the picker, so we show a capped page and point users at
     * search for the rest. */
    const BrowseCap = 500;

    /** The glyphs for the active script- or Unicode-category browse view,
     * memoized (per-render filtering over the full codepoint list would lag)
     * and capped. Null when a different view is active (search, emoji group,
     * custom). */
    let browse = $derived.by<{ list: Codepoint[]; total: number } | null>(
        () => {
            if (codepoints === null || searching) return null;
            let all: Codepoint[] | null = null;
            if (script !== undefined)
                all = codepoints.filter(
                    (code) =>
                        code.script === script &&
                        code.hex.length === 1 &&
                        isCodepointRenderable(code.hex[0]),
                );
            else if (category === 'Shapes' || category === 'Arrows') {
                const ranges = category === 'Shapes' ? Shapes : Arrows;
                all = codepoints.filter(
                    (code) =>
                        code.hex.length === 1 &&
                        isCodepointRenderable(code.hex[0]) &&
                        ranges.some(
                            ([start, end]) =>
                                code.hex[0] >= start && code.hex[0] <= end,
                        ),
                );
            } else if (category !== undefined && category.length === 2)
                all = codepoints.filter(
                    (code) =>
                        code.category === category &&
                        code.hex.every(isCodepointRenderable),
                );
            if (all === null) return null;
            return { list: all.slice(0, BrowseCap), total: all.length };
        },
    );
</script>

{#snippet choice(hex: number[])}
    <div class="emoji" class:selected={String.fromCodePoint(...hex) === glyph}
        ><Button
            tip={() => localizedNameFor(hex)}
            action={() => pick(withPresentation(String.fromCodePoint(...hex)))}
            ><span
                class="emoji"
                class:mono={choosePresentation && presentation === 'mono'}
                >{String.fromCodePoint(...hex)}</span
            ></Button
        ></div
    >
{/snippet}

{#snippet characterChoice(character: Character)}
    <div
        class="emoji"
        class:selected={`@${character.name}` === glyph}
        class:empty={character.shapes.length === 0}
    >
        <Button
            tip={() =>
                character.description.length > 0
                    ? character.description
                    : character.name}
            action={() => pick(`@${character.name}`)}
        >
            {@html characterToSVG(character, '1.25em')}
        </Button>
    </div>
{/snippet}

<div class="picker">
    <div class="filter">
        {#if externalQuery === undefined}
            <TextField
                id="character-search"
                placeholder={SEARCH_SYMBOL}
                description={(l) => l.ui.source.cursor.search}
                bind:text={internalQuery}
            />
        {/if}
        {#if codepoints !== null}
            <Options
                label={(l) => l.ui.emoji.scriptLabel}
                value={script}
                options={[
                    {
                        value: undefined,
                        label: (l) => l.ui.emoji.script,
                        languages: [],
                    },
                    ...availableScripts.map((iso) => ({
                        value: iso,
                        label: scriptLabel(iso),
                        languages: getLanguagesForScript(iso),
                    })),
                ]}
                change={(value) => {
                    script = value;
                    if (script !== undefined) {
                        category = undefined;
                        internalQuery = '';
                    }
                }}
            >
                {#snippet item(option, localized)}
                    <span class="script-option">
                        {@render localized(option.label)}
                        {#if option.languages && option.languages.length > 0}
                            {@const top = option.languages.slice(
                                0,
                                MaxScriptLanguages,
                            )}
                            {@const remainder =
                                option.languages.length - top.length}
                            <span class="languages"
                                >{top.join(', ')}{#if remainder > 0}
                                    — {$locales
                                        .concretize(
                                            (l) => l.ui.emoji.moreLanguages,
                                            { count: remainder },
                                        )
                                        .toText()}{/if}</span
                            >
                        {/if}
                    </span>
                {/snippet}
            </Options>
        {/if}
        {#if choosePresentation}
            <!-- Icon-only, and each icon is drawn in the presentation it
                 selects, so the control demonstrates its own effect. Beside the
                 script chooser because it filters what a pick means the same
                 way those filter what is offered. -->
            <Mode
                uiid="presentation"
                modes={(l) => l.ui.emoji.presentation}
                icons={[withColorEmoji('🎨'), withMonoEmoji('🎨')]}
                labeled={false}
                modeLabels={false}
                choice={presentation === 'color' ? 0 : 1}
                select={(choice) =>
                    (presentation = choice === 0 ? 'color' : 'mono')}
            />
        {/if}
        {#if category === 'So-pe'}
            <Options
                label={(l) => l.ui.emoji.skinTone}
                value={skinTone}
                options={skinToneOptions}
                change={(value) => (skinTone = value)}
            />
        {/if}
    </div>

    <Tabbed
        iconic
        tabs={(l) => l.ui.emoji.groups}
        wrap
        choice={searching
            ? SearchCategoryIndex
            : category === undefined
              ? undefined
              : VisibleCategories.indexOf(category)}
        select={(choice) => {
            internalQuery = '';
            clearQuery?.();
            script = undefined;
            category = VisibleCategories[choice];
        }}
        omit={[
            ...(showCustom ? [] : [0]),
            ...(searching ? [] : [SearchCategoryIndex]),
        ]}
    >
        {#snippet children()}
            <div class="emojis">
                {#if searching && codepoints !== null}
                    <!-- Show the search results if there's a query, characters first. -->
                    {#each characterResults as character}
                        {@render characterChoice(character)}
                    {/each}
                    {#each results as code}
                        {@render choice(code.hex)}
                    {/each}
                {:else if codepoints === null}
                    <!-- Show loading feedback if the codepoints aren't yet loaded. -->
                    <Spinning></Spinning>
                {:else if showCustom && category === 'Custom'}
                    <!-- Show the public custom characters -->
                    {#each publicCharacters as character}
                        {@render characterChoice(character)}
                    {:else}
                        <Link to="/characters"
                            ><LocalizedText
                                path={(l) => l.ui.emoji.noCharacters}
                            /></Link
                        >
                    {/each}
                {:else if category !== undefined && category.startsWith('So-')}
                    <!-- Is it an emoji group? Show all the emojis in that group, and only the selected skin tone. -->
                    {@const emojiGroup = category.split('-')[1]}
                    {@const filtered = codepoints.filter(
                        (code) =>
                            // It's in the group
                            code.emoji?.group === emojiGroup &&
                            // It is not an emoji that supports skin tone variation
                            (!skinToneEligibleCodepoints.has(
                                code.hex
                                    .filter((cp) => !isSkinToneModifier(cp))
                                    .join(','),
                            ) ||
                                // It does support skin tone, but none is selected and this emoji doesn't have a modifier
                                (skinTone === undefined &&
                                    !hasSkinToneModifier(code.hex)) ||
                                // A tone is selected, and this emoji has the corresponding modifier
                                (skinTone !== undefined &&
                                    code.hex.includes(parseInt(skinTone)))),
                    )}
                    {#each filtered as code}
                        {@render choice(code.hex)}
                    {/each}
                {:else if browse !== null}
                    <!-- A script or Unicode-category browse view: a memoized, capped
                 page of renderable glyphs; the rest are reachable via search. -->
                    {#each browse.list as code}
                        {@render choice(code.hex)}
                    {/each}
                    {#if browse.total > browse.list.length}
                        <div class="more">
                            {$locales
                                .concretize((l) => l.ui.emoji.moreGlyphs, {
                                    count: browse.list.length,
                                })
                                .toText()}
                        </div>
                    {/if}
                {:else}
                    <!-- No category and no script: invite the user to pick one. -->
                    <div class="hint">
                        <LocalizedText path={(l) => l.ui.emoji.pickFilter} />
                    </div>
                {/if}
            </div>
        {/snippet}
    </Tabbed>
</div>

<style>
    .picker {
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        row-gap: var(--wordplay-spacing-half);
        width: 100%;
    }

    .filter {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        background: var(--wordplay-background);
        padding-bottom: var(--wordplay-spacing-half);
    }

    .emojis {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing-half);
        row-gap: var(--wordplay-spacing-half);
        overflow-y: auto;
        max-height: 15em;
    }

    .emoji {
        /* Emoji faces first, then Noto Sans for Latin/Cyrillic/Greek glyphs,
           then the lazy per-script fallbacks so glyphs of any other script
           render in their Noto font instead of tofu. */
        font-family:
            'Noto Color Emoji', 'Noto Emoji', 'Noto Sans',
            var(--wordplay-fallback-fonts), sans-serif;
        font-size: 1.2em;
    }

    /* Previewing the pick: the class decides the face, matching how the editor
       and the stage choose one, rather than relying on the selector alone. */
    .emoji.mono {
        font-family: var(--wordplay-emoji-mono-font);
    }

    .selected {
        background: var(--wordplay-highlight-color);
        border-radius: var(--wordplay-border-radius);
        scale: 1.5;
    }

    /* A character with no shapes paints nothing, so its tile would be an
       invisible button. Dashed, like other "nothing to show" placeholders. */
    .empty {
        border: var(--wordplay-border-color) dashed var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
    }

    .hint {
        font-style: italic;
        color: var(--wordplay-inactive-color);
        padding: var(--wordplay-spacing-half);
    }

    /* The "showing N — search to find more" caption below a capped grid. */
    .more {
        flex-basis: 100%;
        font-style: italic;
        color: var(--wordplay-inactive-color);
        padding: var(--wordplay-spacing-half);
    }

    .script-option {
        display: flex;
        flex-direction: column;
        gap: calc(var(--wordplay-spacing-half) / 2);
    }

    .languages {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        max-width: 20em;
        white-space: normal;
    }
</style>
