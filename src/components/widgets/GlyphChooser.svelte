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
    ] as const;

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
</script>

<script lang="ts">
    import Link from '@components/app/Link.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import { characterToSVG } from '@db/characters/Character';
    import { CharactersDB, locales } from '@db/Database';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { onMount } from 'svelte';
    import { getCodepoints, type Codepoint } from '../../unicode/Unicode';
    import Button from './Button.svelte';
    import LocalizedText from './LocalizedText.svelte';
    import Mode from './Mode.svelte';
    import Options, { type Option } from './Options.svelte';
    import TextField from './TextField.svelte';

    interface Props {
        /** Callback for when a glyph is chosen */
        pick: (glyph: string) => void;
        /** The currently selected glyph; if provided, it will be highlighted.  */
        glyph?: string | undefined;
        /** Whether to show custom characters*/
        showCustom?: boolean;
    }

    let { pick, glyph = undefined, showCustom = true }: Props = $props();

    let publicCharacters = $derived(
        CharactersDB.getEditableCharacters().filter((c) => c.public),
    );

    /** One of VisibleCategories */
    let category = $state<(typeof VisibleCategories)[number]>('So-sm');

    /** The Unicode codepoints metadata, loaded async on mount */
    let codepoints = $state<Codepoint[] | null>(null);

    /** The current query */
    let query = $state('');

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
        getCodepoints().then((cp) => {
            codepoints = cp;
        });
    });

    /** Map an emoji group string to its visible category index. Used to search, as the tooltips are where the text is stored. */
    function getEmojiGroupIndex(group: string) {
        return VisibleCategories.findIndex((cat) => cat.endsWith(`-${group}`));
    }

    /** The filtered codepoints */
    let results = $derived(
        query.length < 3 || codepoints === null
            ? []
            : codepoints.filter(
                  (code) =>
                      code.name.includes(query) ||
                      (code.emoji &&
                          $locales
                              .get((l) => l.ui.emoji.groups.tips)
                              [
                                  getEmojiGroupIndex(code.emoji.group)
                              ].includes(query)),
              ),
    );
</script>

{#snippet choice(hex: number[], name: string)}
    <div class="emoji" class:selected={String.fromCodePoint(...hex) === glyph}
        ><Button
            padding={false}
            tip={() => name}
            action={() => pick(String.fromCodePoint(...hex))}
            ><span class="emoji">{String.fromCodePoint(...hex)}</span></Button
        ></div
    >
{/snippet}

<div class="picker">
    <div class="filter">
        <TextField
            id="character-search"
            placeholder={SEARCH_SYMBOL}
            description={(l) => l.ui.source.cursor.search}
            bind:text={query}
        />
        {#if category === 'So-pe'}
            <Options
                label={(l) => l.ui.emoji.skinTone}
                value={skinTone}
                options={skinToneOptions}
                change={(value) => (skinTone = value)}
            />
        {/if}
        <Mode
            labeled={false}
            modes={(l) => l.ui.emoji.groups}
            wrap={true}
            small
            choice={VisibleCategories.indexOf(category)}
            select={(choice) => {
                query = '';
                category = VisibleCategories[choice];
            }}
            omit={showCustom ? [] : [0]}
        ></Mode>
    </div>

    <div class="emojis">
        {#if query.length > 2 && codepoints !== null}
            <!-- Show the search results if there's a query. -->
            {#each results as code}
                {@render choice(code.hex, code.name)}
            {/each}
        {:else if showCustom && category === 'Custom'}
            <!-- Show the public custom characters -->
            {#each publicCharacters as character}
                <div
                    class="emoji"
                    class:selected={`@${character.name}` === glyph}
                >
                    <Button
                        tip={() => character.description}
                        padding={false}
                        action={() => pick(`@${character.name}`)}
                    >
                        {@html characterToSVG(character, '1.25em')}
                    </Button>
                </div>
            {:else}
                <Link to="/characters"
                    ><LocalizedText
                        path={(l) => l.ui.emoji.noCharacters}
                    /></Link
                >
            {/each}
        {:else if codepoints === null}
            <!-- Show loading feedback if the codepoints aren't yet loaded. -->
            <Spinning></Spinning>
        {:else if category.startsWith('So-')}
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
                {@render choice(code.hex, code.name)}
            {/each}
        {:else if category === 'Shapes' || category === 'Arrows'}
            <!-- Is this composite category? Show all the codepoints in its ranges. -->
            {@const ranges = category === 'Shapes' ? Shapes : Arrows}
            {@const glyphs = codepoints.filter((code) =>
                ranges.some(
                    ([start, end]) =>
                        code.hex.length === 1 &&
                        code.hex[0] >= start &&
                        code.hex[0] <= end,
                ),
            )}
            {#each glyphs as code}
                {@render choice(code.hex, code.name)}
            {/each}
        {:else if category.length === 2}
            <!-- Is this a Unicode category? Show all the codepoints with that category. -->
            {#each codepoints.filter((code) => code.category === category) as code}
                {@render choice(code.hex, code.name)}
            {/each}
        {/if}
    </div>
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
        font-family: 'Noto Color Emoji', 'Noto Emoji';
        font-size: 1.2em;
    }

    .selected {
        background: var(--wordplay-highlight-color);
        border-radius: var(--wordplay-border-radius);
        scale: 1.5;
    }
</style>
