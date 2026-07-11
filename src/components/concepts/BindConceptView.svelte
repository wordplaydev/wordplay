<script lang="ts">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type BindConcept from '@concepts/BindConcept';
    import { locales } from '@db/Database';
    import AnyType from '@nodes/AnyType';
    import Speech from '@components/lore/Speech.svelte';
    import RootView from '@components/project/RootView.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import elideNode from '@components/concepts/elideNode';

    interface Props {
        concept: BindConcept;
    }

    let { concept }: Props = $props();
</script>

<Speech character={concept.getCharacter($locales)} below={true}>
    {#snippet content()}
        {#if concept.getDocs($locales)[0]}
            <MarkupHTMLView
                markup={{ perLocale: (l) => concept.getDocs(l)[0] }}
            />
        {:else}
            <LocalizedText path={(l) => l.ui.docs.nodoc} />
        {/if}
    {/snippet}
    {#snippet aside()}
        <!-- Render the type/value signature as one inline unit in text mode, not
             blocks. Elide very large union types (e.g. Phrase.face's ~60 font
             names) to a short preview + "or N other options": rendering the
             full binary UnionType tree recurses NodeView per member and
             overflows the call stack at that depth. -->
        <span class="signature"
            >{#if concept.bind.type &&
                !(concept.bind.type instanceof AnyType)}{@const elision =
                    elideNode(
                        concept.bind.type,
                        $locales,
                    )}•{#if elision}<RootView
                        node={elision.preview}
                        inline
                        locale="symbolic"
                        blocks={false}
                    /><MarkupHTMLView
                        markup={elision.suffix}
                        inline
                    />{:else}<RootView
                        node={concept.bind.type}
                        inline
                        locale="symbolic"
                        blocks={false}
                    />{/if}{/if}{#if concept.bind.value}: <RootView
                    node={concept.bind.value}
                    inline
                    locale="symbolic"
                    blocks={false}
                />{/if}</span
        >
    {/snippet}
</Speech>

<style>
    .signature {
        /* Allow the signature to shrink and soft-wrap inside the flex speaker. */
        min-width: 0;
    }
</style>
