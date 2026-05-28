<script lang="ts">
    import GlyphChooser from '@components/widgets/GlyphChooser.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import type Caret from '@edit/caret/Caret';
    import FormattedLiteral from '@nodes/FormattedLiteral';
    import Node from '@nodes/Node';
    import TextLiteral from '@nodes/TextLiteral';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { withColorEmoji } from '@unicode/emoji';
    import { IdleKind, getEditors } from '@components/project/Contexts';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import Commands, { Category } from '@components/editor/commands/Commands';

    interface Props {
        sourceID: string;
    }

    let { sourceID }: Props = $props();

    const editors = getEditors();

    // Get all of the insertion commands for programming language symbols.
    const Defaults = Commands.filter(
        (command) => command.category === Category.Insert,
    );

    let expanded = $state(false);
    let query = $state('');

    // Auto-expand when the user starts typing a search query.
    $effect(() => {
        if (query.length > 0) expanded = true;
    });

    function toggle() {
        expanded = !expanded;
        // Clear the query when collapsing so it doesn't linger.
        if (!expanded) query = '';
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
                on={expanded}
                {toggle}>{withColorEmoji(expanded ? '😴' : '😊')}</Toggle
            >
        </div>
    {/snippet}

    {#snippet glyphChooserView()}
        <GlyphChooser externalQuery={query} pick={(glyph) => insert(glyph)} />
    {/snippet}

    {#snippet defaultButton(i: number)}
        <CommandButton
            command={Defaults[i]}
            {sourceID}
            token
            focusAfter
        />
    {/snippet}

    {#if expanded}
        <!-- Expanded: GlyphChooser takes the stretchy slot; controls pinned right. -->
        <OverflowToolbar
            items={[]}
            stretchy={glyphChooserView}
            pinned={[glyphControls]}
        />
    {:else}
        <!-- Collapsed: each CommandButton is its own item, overflows one by one. -->
        <OverflowToolbar
            items={{ count: Defaults.length, render: defaultButton }}
            pinned={[glyphControls]}
        />
    {/if}
</section>

<style>
    section {
        display: flex;
        background-color: var(--wordplay-background);
        border-top: var(--wordplay-border-color) solid 1px;
        padding-inline-start: var(--wordplay-spacing);
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
