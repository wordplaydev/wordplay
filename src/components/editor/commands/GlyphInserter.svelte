<script lang="ts">
    import Commands, { Category } from '@components/editor/commands/Commands';
    import { IdleKind, getEditors } from '@components/project/Contexts';
    import { offeredInserts } from '@components/editor/commands/offered';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import GlyphChooser from '@components/widgets/GlyphChooser.svelte';
    import PhonemeChooser from '@components/widgets/PhonemeChooser.svelte';
    import { projectHasMusic } from '@output/Music/referencedInstruments';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Caret from '@edit/caret/Caret';
    import FormattedLiteral from '@nodes/FormattedLiteral';
    import Node from '@nodes/Node';
    import TextLiteral from '@nodes/TextLiteral';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { withColorEmoji } from '@unicode/emoji';
    import { debounced } from '@util/debounce.svelte';

    interface Props {
        sourceID: string;
    }

    let { sourceID }: Props = $props();

    const editors = getEditors();

    // Get all of the insertion commands for programming language symbols.
    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert,
    );

    /**
     * The caret, once it has stopped moving.
     *
     * Deliberately not `keyboardEditIdle`: a pure navigation move bypasses the
     * idle machinery entirely (it makes no edit, so there's nothing to
     * re-analyze), which means that store reads "idle" in the middle of an
     * arrow-key repeat. `displayedCaret` already suppresses input flurries, and
     * the debounce adds the settle this needs, so deciding which characters to
     * offer costs a map lookup and a timer per publish rather than an ancestor
     * walk.
     */
    const settled = debounced(
        () => $editors?.get(sourceID)?.displayedCaret,
        400,
    );

    /** Which characters can mean anything where the caret is, most relevant
     * first. See offeredInserts for what "relevant" means. */
    let offered = $derived.by(() => {
        const state = $editors?.get(sourceID);
        return offeredInserts(Defaults, state?.project, settled.current);
    });

    /** Which panel has taken the row's place, if any. The two choosers are
     * mutually exclusive: they compete for the same space. */
    let mode = $state<'row' | 'glyphs' | 'phonemes'>('row');
    let expanded = $derived(mode !== 'row');
    let query = $state('');

    /** The phoneme chooser is only offered to a project that makes music,
     * since IPA means nothing to anything that doesn't sing. */
    let singing = $derived.by(() => {
        const project = $editors?.get(sourceID)?.project;
        return project !== undefined && projectHasMusic(project);
    });

    // Auto-expand when the user starts typing a search query.
    $effect(() => {
        if (query.length > 0 && mode === 'row') mode = 'glyphs';
    });

    function toggleGlyphs() {
        mode = mode === 'glyphs' ? 'row' : 'glyphs';
        // Clear the query when collapsing so it doesn't linger.
        if (mode !== 'glyphs') query = '';
    }

    function togglePhonemes() {
        mode = mode === 'phonemes' ? 'row' : 'phonemes';
    }

    /** The node closest to the caret — for ancestor walks. */
    function caretAnchor(caret: Caret): Node | undefined {
        if (caret.position instanceof Node) return caret.position;
        if (typeof caret.position === 'number')
            return caret.tokenIncludingSpace ?? caret.tokenExcludingSpace;
        return caret.source.getTokenAt(caret.position[0]);
    }

    function insert(text: string) {
        const editorState = $editors?.get(sourceID);
        if (!editorState) return;
        const caret = editorState.caret;
        const isCharacterRef = text.startsWith('@');

        // Custom-character refs need different treatment depending on what
        // the caret is inside — TextLiteral can't hold them, FormattedLiteral
        // can. The strategy is to compute the right insertion text + caret
        // selection and then route everything through caret.insert(), which
        // already returns LocaleTextAccessor on failure so caret-shake
        // feedback flows naturally.
        let target = caret;
        let payload = text;

        if (isCharacterRef) {
            const anchor = caretAnchor(caret);
            const literal = anchor
                ? [anchor, ...caret.source.root.getAncestors(anchor)].find(
                      (n): n is TextLiteral | FormattedLiteral =>
                          n instanceof TextLiteral ||
                          n instanceof FormattedLiteral,
                  )
                : undefined;

            if (literal) {
                // Did the user select the whole literal as a node? That's an
                // explicit "replace this entire thing" gesture, and it
                // overrides the multi-translation skip below.
                const wholeSelected = caret.position === literal;

                // Caret sits inside one specific translation among many:
                // there's no single right answer for where to put the
                // character, and converting a TextLiteral would silently
                // drop the others. Refuse with a caret shake.
                if (!wholeSelected && literal.texts.length > 1) {
                    editorState.edit(
                        (l) => l.ui.source.cursor.ignored.noInsert,
                        IdleKind.Typed,
                        false,
                    );
                    return;
                }

                if (literal instanceof TextLiteral || wholeSelected) {
                    // Replace the whole literal with a fresh FormattedLiteral
                    // text. caret.insert(node-position, text) does the
                    // delete-and-insert in one step; the parser turns the
                    // backtick-wrapped payload into a FormattedLiteral.
                    // Preserve the first translation's language tag if any.
                    const lang = literal.texts[0]?.language?.toWordplay() ?? '';
                    target = caret.withPosition(literal);
                    payload = `\`${text}\`${lang}`;
                }
                // Otherwise: FormattedLiteral with one translation, caret
                // inside its markup. Insert the bare @ref — no backtick wrap.
            } else {
                // Outside any text/format literal: wrap in backticks so the
                // bare @ref parses as a new FormattedLiteral.
                payload = `\`${text}\``;
            }
        }

        editorState.edit(
            target.insert(payload, editorState.blocks, editorState.project),
            IdleKind.Typed,
            false,
        );
    }
</script>

<section class:expanded class="directory">
    {#snippet glyphControls()}
        <div class="controls">
            <TextField
                id="glyph-search"
                max="5m"
                placeholder={SEARCH_SYMBOL}
                description={(l) => l.ui.source.cursor.search}
                bind:text={query}
            />
            <Toggle
                uiid="directory"
                tips={(l) => l.ui.source.toggle.characters}
                on={mode === 'glyphs'}
                toggle={toggleGlyphs}
                >{withColorEmoji(mode === 'glyphs' ? '😴' : '😊')}</Toggle
            >
            {#if singing}
                <!-- The voice's own emoji, so the docs can point at it by
                     picture and someone can find this without reading. -->
                <Toggle
                    uiid="phonemes"
                    tips={(l) => l.ui.phonemes.toggle}
                    on={mode === 'phonemes'}
                    toggle={togglePhonemes}>{withColorEmoji('🤖')}</Toggle
                >
            {/if}
        </div>
    {/snippet}

    {#snippet glyphChooserView()}
        <GlyphChooser
            externalQuery={query}
            clearQuery={() => (query = '')}
            pick={(glyph) => insert(glyph)}
        />
    {/snippet}

    {#snippet phonemeChooserView()}
        <PhonemeChooser pick={(symbol) => insert(symbol)} />
    {/snippet}

    {#snippet defaultButton(i: number)}
        <CommandButton command={offered[i]} {sourceID} token focusAfter />
    {/snippet}

    {#if expanded}
        <!-- Expanded: a chooser takes the stretchy slot; controls pinned right. -->
        <OverflowToolbar
            items={[]}
            stretchy={mode === 'phonemes'
                ? phonemeChooserView
                : glyphChooserView}
            pinned={[glyphControls]}
        />
    {:else}
        <!-- Collapsed: each CommandButton is its own item, overflows one by one. -->
        <OverflowToolbar
            items={{ count: offered.length, render: defaultButton }}
            pinned={[glyphControls]}
        />
    {/if}
</section>

<style>
    section {
        display: flex;
        gap: var(--wordplay-spacing);
        background-color: var(--wordplay-background);
        border-top: var(--wordplay-border-color) solid 1px;
        padding-inline-start: var(--wordplay-spacing);
    }

    .expanded {
        padding-block-start: var(--wordplay-spacing);
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        flex-shrink: 0;
    }
</style>
