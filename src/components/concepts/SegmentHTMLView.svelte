<script lang="ts">
    import ConceptRef from '@locale/ConceptRef';
    import NodeRef from '@locale/NodeRef';
    import ValueRef from '@locale/ValueRef';
    import ConceptLink from '@nodes/ConceptLink';
    import Example from '@nodes/Example';
    import type { Segment } from '@nodes/Paragraph';
    import Token from '@nodes/Token';
    import UnknownType from '@nodes/UnknownType';
    import WebLink from '@nodes/WebLink';
    import Words from '@nodes/Words';
    import type Spaces from '@parser/Spaces';
    import { unescapeMarkupSymbols } from '@parser/Tokenizer';
    import { BULLET_SYMBOL } from '@parser/Symbols';
    import RootView from '@components/project/RootView.svelte';
    import ValueView from '@components/values/ValueView.svelte';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import elideNode from '@components/concepts/elideNode';
    import ExampleUI from '@components/concepts/ExampleUI.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import WebLinkHTMLView from '@components/concepts/WebLinkHTMLView.svelte';
    import WordsHTMLView from '@components/concepts/WordsHTMLView.svelte';
    import EmojisRepaired from '@components/widgets/EmojisRepaired.svelte';

    interface Props {
        segment: Segment;
        spaces: Spaces;
        /** True if this is the only segment in a paragraph*/
        alone: boolean;
        /** True if this is the first segment in a paragraph */
        first?: boolean;
    }

    let { segment, spaces, alone, first }: Props = $props();

    // Compute whether there is whitespace before this segment that should render as a space.
    // Spaces, tabs, and a single newline all count (so soft-wrapped source still
    // gets a space between sentences), but not paragraph breaks (blank lines) or
    // segments at the start of a paragraph.
    function isTokenSpaced(token: Token) {
        if (first || !(token instanceof Token)) return false;
        const space = spaces.getSpace(token);
        return /^[ \t\n]+$/.test(space) && !space.includes('\n\n');
    }

    function getTokenText(token: Token) {
        // Don't apply withColorEmoji here. Wrapping every emoji sequence in
        // a U+FE0F variation selector forced Safari into a code path that
        // uses Apple Color Emoji even when Noto Color Emoji is first in the
        // font-family cascade, breaking visual consistency with PhraseView
        // / CreatorView. The locale source text already carries U+FE0F on
        // the emoji that need it (e.g. 🖱️ ⌨️ 🖥️), so passing the text
        // through unchanged lets each emoji use its natural Unicode
        // presentation default — color emoji render in color via Noto,
        // text-default symbols stay text unless the source explicitly
        // requests color.
        return (
            token.startsWith(BULLET_SYMBOL)
                ? token.getText().substring(1).trimStart()
                : unescapeMarkupSymbols(token.getText())
        ).replaceAll('--', '—');
    }
</script>

{#if segment instanceof WebLink}<WebLinkHTMLView link={segment} {spaces} />
{:else if segment instanceof Example}{#if alone}<ExampleUI
            example={segment}
            {spaces}
            evaluated={alone}
        />
    {:else}<ConceptPreview
            node={segment.program}
            inline={true}
            {spaces}
            outline={false}
            describe={false}
        />{/if}
{:else if segment instanceof ConceptLink || segment instanceof ConceptRef}<ConceptLinkUI
        link={segment}
        symbolic={false}
    />
{:else if segment instanceof Words}<WordsHTMLView words={segment} {spaces} />
{:else if segment instanceof NodeRef}{#if segment.node instanceof UnknownType}
        <MarkupHTMLView
            markup={segment.node.getDescription(
                segment.locales,
                segment.context,
            )}
            inline
        />
    {:else}
        {@const elision = elideNode(segment.node, segment.locales)}
        {#if elision}
            <!-- Render the elided preview (still as code, via RootView) and
                 append the localized "or N other options" suffix as markup. -->
            <RootView
                node={elision.preview}
                inline
                locale="symbolic"
                blocks={false}
            /><MarkupHTMLView markup={elision.suffix} inline />
        {:else}<RootView
                node={segment.node}
                inline
                locale="symbolic"
                blocks={false}
            />{/if}
    {/if}
{:else if segment instanceof ValueRef}<strong
        ><ValueView value={segment.value} /></strong
    >
    <!-- Remove the bullet if the words start with one. -->
{:else if segment instanceof Token}{#if isTokenSpaced(segment)}&nbsp;{/if}<EmojisRepaired
        text={getTokenText(segment)}
    />{/if}
