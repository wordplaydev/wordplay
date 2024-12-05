<script lang="ts">
    import ConceptLink from '../../nodes/ConceptLink';
    import Token from '../../nodes/Token';
    import WebLink from '../../nodes/WebLink';
    import Words from '../../nodes/Words';
    import type Spaces from '../../parser/Spaces';
    import WebLinkHTMLView from './WebLinkHTMLView.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import Example from '../../nodes/Example';
    import ExampleUI from './ExampleUI.svelte';
    import NodeRef from '../../locale/NodeRef';
    import ValueRef from '../../locale/ValueRef';
    import ValueView from '../values/ValueView.svelte';
    import ConceptRef from '../../locale/ConceptRef';
    import type { Segment } from '../../nodes/Paragraph';
    import WordsHTMLView from './WordsHTMLView.svelte';
    import RootView from '../project/RootView.svelte';
    import { unescapeMarkupSymbols } from '../../parser/Tokenizer';
    import UnknownType from '../../nodes/UnknownType';
    import MarkupHtmlView from './MarkupHTMLView.svelte';
    import { withColorEmoji } from '../../unicode/emoji';
    import CodeView from './CodeView.svelte';

    interface Props {
        segment: Segment;
        spaces: Spaces;
        /** True if this is the only segment in a paragraph*/
        alone: boolean;
    }

    let { segment, spaces, alone }: Props = $props();
</script>

{#if segment instanceof WebLink}<WebLinkHTMLView
        link={segment}
        {spaces}
    />{:else if segment instanceof Example}{#if alone}<ExampleUI
            example={segment}
            {spaces}
            evaluated={alone}
            inline={false}
        />{:else}<CodeView
            node={segment.program}
            inline={true}
            {spaces}
            outline={false}
            describe={false}
        />{/if}{:else if segment instanceof ConceptLink || segment instanceof ConceptRef}<ConceptLinkUI
        link={segment}
    />{:else if segment instanceof Words}<WordsHTMLView
        words={segment}
        {spaces}
    />{:else if segment instanceof NodeRef}{#if segment.node instanceof UnknownType}
        <MarkupHtmlView
            markup={segment.node.getDescription(
                segment.locales,
                segment.context,
            )}
            inline
        />
    {:else}<RootView
            node={segment.node}
            inline
            localized="symbolic"
            blocks={false}
        />{/if}{:else if segment instanceof ValueRef}<strong
        ><ValueView value={segment.value} /></strong
    >{:else if segment instanceof ConceptRef}<ConceptLinkUI link={segment} />
    <!-- Remove the bullet if the words start with one. -->
{:else if segment instanceof Token}{#if /^[ ]+$/.test(spaces.getSpace(segment))}&nbsp;{/if}{withColorEmoji(
        (segment.startsWith('•')
            ? segment.getText().substring(1).trimStart()
            : withColorEmoji(unescapeMarkupSymbols(segment.getText()))
        ).replaceAll('--', '—'),
    )}{/if}
