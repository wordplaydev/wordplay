<script lang="ts">
    /**
     * Every sound the singing voice can make, to browse, hear, and insert.
     *
     * This is the reference for what the IPA symbols mean, not just a keyboard
     * for typing them. The written alphabet is the obstacle — there is no key
     * for `ʃ` and no way to guess what one sounds like — and the honest
     * definition of a speech sound is the sound, which is why every row plays.
     * A gloss like "the sh in she" only helps a reader of English; a played `ʃ`
     * helps everyone, in all thirty languages, with nothing to translate.
     *
     * The table is `Phonemes` itself, in the order it already keeps, which is
     * the order of the IPA chart — so the vowels lead and the clicks trail.
     */
    import { locales } from '@db/Database';
    import { Phonemes, type Manner } from '@output/Music/phonemes';
    import previewPhoneme from '@output/Music/previewPhoneme';
    import Button from '@components/widgets/Button.svelte';

    interface Props {
        /** Called with the symbol to type at the caret. */
        pick: (symbol: string) => void;
    }

    let { pick }: Props = $props();

    /** The `groups` locale array is positional; this is the order it matches. */
    const Order: Manner[] = [
        'vowel',
        'approximant',
        'lateral',
        'nasal',
        'fricative',
        'trill',
        'plosive',
        'click',
    ];

    /** Each symbol paired with its example word, by position in the table —
     * which is the contract `ui.phonemes.examples` is written against. */
    const symbols = [...Phonemes.keys()];

    let grouped = $derived(
        Order.map((manner) => ({
            manner,
            heading:
                $locales.getTextStructure((l) => l.ui.phonemes.groups)[
                    Order.indexOf(manner)
                ] ?? manner,
            sounds: symbols
                .map((symbol, index) => ({ symbol, index }))
                .filter(
                    ({ symbol }) => Phonemes.get(symbol)?.manner === manner,
                ),
        })).filter((group) => group.sounds.length > 0),
    );

    function exampleFor(index: number): string {
        return (
            $locales.getTextStructure((l) => l.ui.phonemes.examples)[index] ??
            ''
        );
    }
</script>

<div class="phonemes">
    {#each grouped as group (group.manner)}
        <div class="group">
            <h3>{group.heading}</h3>
            <div class="sounds">
                {#each group.sounds as { symbol, index } (symbol)}
                    <div class="sound">
                        <!-- The symbol itself is the insert control, so the
                             thing you press is the thing you get. -->
                        <Button
                            tip={() =>
                                $locales
                                    .concretize((l) => l.ui.phonemes.insert, {
                                        symbol,
                                    })
                                    .toText()}
                            action={() => pick(symbol)}
                            ><span class="symbol">{symbol}</span></Button
                        >
                        <Button
                            tip={() =>
                                $locales
                                    .concretize((l) => l.ui.phonemes.play, {
                                        symbol,
                                    })
                                    .toText()}
                            action={() => previewPhoneme(symbol)}>▶</Button
                        >
                        <span class="example">{exampleFor(index)}</span>
                    </div>
                {/each}
            </div>
        </div>
    {/each}
</div>

<style>
    .phonemes {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        /* Capped in em, not vh, and matching GlyphChooser's 15em in the same
           slot. A tile is a box inside the viewport rather than the viewport,
           and the tile's footer takes its intrinsic height without shrinking —
           so a vh cap here reserved 40% of the *window* and left the code with
           whatever was over. */
        max-height: 15em;
        overflow-y: auto;
        padding: var(--wordplay-spacing);
    }

    .group {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    h3 {
        /* Only the top margin: headings app-wide carry a `rotate(-1deg)` and a
           bottom margin together, and the margin is the room the tilt leans
           into. Zeroing both left the heading's low corner sitting on the first
           row of chips. */
        margin-block-start: 0;
        font-size: var(--wordplay-small-font-size);
        font-family: var(--wordplay-app-font);
    }

    .sounds {
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .sound {
        display: flex;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding-inline: calc(var(--wordplay-spacing) / 2);
    }

    .symbol {
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-font-size);
    }

    .example {
        font-size: var(--wordplay-small-font-size);
        opacity: 0.75;
        white-space: nowrap;
    }
</style>
