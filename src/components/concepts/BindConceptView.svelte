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

    /**
     * A published share's implementation is not its documentation.
     *
     * A kit's exports render through these same views, and a `↑` bind's value is the
     * whole of it — the tunes kit's songs are seventy lines of note data each, which
     * tells a reader nothing and buries the next export. So a shared bind shows its name
     * and its type and stops there.
     *
     * `bind.share` is the test because only parsed `↑` source carries that token:
     * `Bind.make` passes none, so every basis definition and everything else the guide
     * documents is untouched, and a function's inputs — which are binds too — keep
     * showing their defaults.
     */
    const shared = $derived(concept.bind.share !== undefined);

    /**
     * The type to show: the annotation as the author wrote it, or, for a share that has
     * none, the type it infers to. Without that fallback, hiding the value would leave an
     * unannotated export with nothing at all beside its name.
     *
     * The inferred one is generalized, because an inferred literal type *is* the value —
     * `↑ dusk: 2` infers `2`, and showing that would put back the implementation this is
     * meant to leave out. An author's own annotation is shown exactly as written.
     */
    const type = $derived.by(() => {
        const declared = concept.bind.type;
        if (declared !== undefined)
            return declared instanceof AnyType ? undefined : declared;
        if (!shared) return undefined;
        const inferred = concept.bind
            .getType(concept.context)
            .generalize(concept.context);
        return inferred instanceof AnyType ? undefined : inferred;
    });
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
            >{#if type}{@const elision = elideNode(
                    type,
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
                        node={type}
                        inline
                        locale="symbolic"
                        blocks={false}
                    />{/if}{/if}{#if concept.bind.value && !shared}: <RootView
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
