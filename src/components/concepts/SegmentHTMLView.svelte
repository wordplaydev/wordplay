<script lang="ts">
    import ConceptRef from '../../locale/ConceptRef';
    import NodeRef from '../../locale/NodeRef';
    import ValueRef from '../../locale/ValueRef';
    import ConceptLink from '../../nodes/ConceptLink';
    import Example from '../../nodes/Example';
    import type { Segment } from '../../nodes/Paragraph';
    import Token from '../../nodes/Token';
    import UnknownType from '../../nodes/UnknownType';
    import WebLink from '../../nodes/WebLink';
    import Words from '../../nodes/Words';
    import type Spaces from '../../parser/Spaces';
    import { unescapeMarkupSymbols } from '../../parser/Tokenizer';
    import { withColorEmoji } from '../../unicode/emoji';
    import RootView from '../project/RootView.svelte';
    import ValueView from '../values/ValueView.svelte';
    import CodeView from './CodeView.svelte';
    import ConceptLinkUI from './ConceptLinkUI.svelte';
    import ExampleUI from './ExampleUI.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import WebLinkHTMLView from './WebLinkHTMLView.svelte';
    import WordsHTMLView from './WordsHTMLView.svelte';

    interface Props {
        segment: Segment;
        spaces: Spaces;
        /** True if this is the only segment in a paragraph*/
        alone: boolean;
        /** True if this is the first segment in a paragraph */
        first?: boolean;
    }

    let { segment, spaces, alone, first }: Props = $props();
</script>

{#if segment instanceof WebLink}<WebLinkHTMLView link={segment} {spaces} />
{:else if segment instanceof Example}{#if alone}<ExampleUI
            example={segment}
            {spaces}
            evaluated={alone}
            inline={false}
        />
    {:else}<CodeView
            node={segment.program}
            inline={true}
            {spaces}
            outline={false}
            describe={false}
        />{/if}
{:else if segment instanceof ConceptLink || segment instanceof ConceptRef}<ConceptLinkUI
        link={segment}
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
    {:else}<RootView
            node={segment.node}
            inline
            locale="symbolic"
            blocks={false}
        />{/if}
{:else if segment instanceof ValueRef}<strong
        ><ValueView value={segment.value} /></strong
    >
    <!-- Remove the bullet if the words start with one. -->
{:else if segment instanceof Token}{#if !first && /^[ ]+$/.test(spaces.getSpace(segment))}&nbsp;{/if}{withColorEmoji(
        (segment.startsWith('•')
            ? segment.getText().substring(1).trimStart()
            : withColorEmoji(unescapeMarkupSymbols(segment.getText()))
        ).replaceAll('--', '—'),
    )}{/if}
