<script lang="ts">
    import ConceptRef from '@locale/ConceptRef';
    import TermRef from '@locale/TermRef';
    import ConceptLink from '@nodes/ConceptLink';
    import ExternalExample from '@nodes/ExternalExample';
    import type { Segment } from '@nodes/Paragraph';
    import { Sym } from '@nodes/Sym';
    import Token from '@nodes/Token';
    import WebLink from '@nodes/WebLink';
    import Words from '@nodes/Words';
    import type Spaces from '@parser/Spaces';
    import { unescapeMarkupSymbols } from '@parser/Tokenizer';
    import { BULLET_SYMBOL } from '@parser/Symbols';
    import Link from '@components/app/Link.svelte';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import TermView from '@components/concepts/TermView.svelte';
    import ExternalExampleView from '@components/concepts/ExternalExampleView.svelte';
    import WebLinkHTMLView from '@components/concepts/WebLinkHTMLView.svelte';
    import WordsHTMLView from '@components/concepts/WordsHTMLView.svelte';
    import EmojisRepaired from '@components/widgets/EmojisRepaired.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import {
        isRichSegment,
        loadRichSegment,
    } from '@components/concepts/richSegment';

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

    // Mirror WebLinkHTMLView: a schemeless ://path URL is an internal wordplay path.
    function getTokenURL(token: Token) {
        const text = token.getText();
        return text.startsWith('://') ? text.replace('://', '/') : text;
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
    <!-- Examples, node references, and values render code, so they arrive with
         the language runtime on demand. While it loads, the app's spinner
         stands in so the gap reads as "coming" rather than as missing text.
         It's aria-hidden: a page of documentation can hold dozens of these,
         and Spinning is a live region, so leaving them exposed would announce
         "loading" dozens of times. Screen readers get the code when it
         arrives. -->
{:else if isRichSegment(segment)}{#await loadRichSegment()}<span
            class="rich-loading"
            aria-hidden="true"><Spinning size={1.5} /></span
        >{:then RichSegment}<RichSegment
            {segment}
            {spaces}
            {alone}
        />{/await}
{:else if segment instanceof ExternalExample}<ExternalExampleView
        example={segment}
    />
{:else if segment instanceof ConceptLink || segment instanceof ConceptRef}<ConceptLinkUI
        link={segment}
        symbolic={false}
    />
{:else if segment instanceof TermRef}<TermView term={segment} />
{:else if segment instanceof Words}<WordsHTMLView words={segment} {spaces} />
    <!-- Remove the bullet if the words start with one. -->
{:else if segment instanceof Token}{#if isTokenSpaced(segment)}&nbsp;{/if}{#if segment.isSymbol(Sym.URL)}{@const url =
            getTokenURL(segment)}<Link external={!url.startsWith('/')} to={url}
            >{segment.getText()}</Link
        >{:else}<EmojisRepaired text={getTokenText(segment)} />{/if}{/if}

<style>
    /* Keep the stand-in on the text baseline so a line of prose doesn't jump
       while the code it contains is still arriving. */
    .rich-loading {
        display: inline-block;
        vertical-align: middle;
    }
</style>
