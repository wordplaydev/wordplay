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

    export let segment: Segment;
    export let spaces: Spaces;
    /** True if this is the only segment in a paragraph*/
    export let alone: boolean;
</script>

{#if segment instanceof WebLink}<WebLinkHTMLView
        link={segment}
        {spaces}
    />{:else if segment instanceof Example}<ExampleUI
        example={segment}
        {spaces}
        evaluated={alone}
        inline={!alone}
    />{:else if segment instanceof ConceptLink}<ConceptLinkUI
        link={segment}
    />{:else if segment instanceof Words}<WordsHTMLView
        words={segment}
        {spaces}
    />{:else if segment instanceof NodeRef}<RootView
        node={segment.node}
        inline
        localized
    />{:else if segment instanceof ValueRef}<strong
        ><ValueView value={segment.value} /></strong
    >{:else if segment instanceof ConceptRef}<ConceptLinkUI
        link={segment}
    />{:else if segment instanceof Token}{#if /^[ ]+$/.test(spaces.getSpace(segment))}&nbsp;{/if}{(segment.startsWith(
        '•'
    )
        ? segment.getText().substring(1).trimStart()
        : segment.getText()
    ).replaceAll('--', '—')}{/if}
