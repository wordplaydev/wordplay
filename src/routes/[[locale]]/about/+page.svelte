<script lang="ts">
    import BigLink from '@components/app/BigLink.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { locales } from '@db/Database';

    /** Also written into the section's prose, so someone with no mail client
     *  configured can copy the address instead of following a dead button. */
    const Address = 'hi@wordplay.dev';

    // The prefilled message can't be written as markup: the tokenizer's mailto
    // rule stops at the address, so a query string would lex as words — and a
    // percent-encoded template in the locale JSON is nothing a translator could
    // read. So the subject and body are ordinary locale strings, encoded here.
    // Unannotated primary text rather than plain text, because this is
    // serialized into a URL rather than displayed: a multilingual join or a
    // machine-translation symbol would end up in the message.
    let inquiry = $derived(
        `mailto:${Address}?subject=${encodeURIComponent(
            $locales.getUnannotatedPrimaryText(
                (l) => l.ui.page.about.districts.subject,
            ),
        )}&body=${encodeURIComponent(
            $locales
                .getUnannotatedTexts((l) => l.ui.page.about.districts.body)
                .join('\n\n'),
        )}`,
    );
</script>

<Title text={(l) => l.ui.page.about.header} />

<Writing reading>
    <PageHeader
        header={(l) => l.ui.page.about.header}
        description={(l) => l.ui.page.about.content}
    />
    <section class="districts">
        <Subheader text={(l) => l.ui.page.about.districts.header} />
        <MarkupHTMLView markup={(l) => l.ui.page.about.districts.content} />
        <BigLink smaller external to={inquiry}
            ><LocalizedText
                path={(l) => l.ui.page.about.districts.link}
            /></BigLink
        >
    </section>
</Writing>

<style>
    /* Writing lays its children out in normal flow, and Subheader zeroes its own
       top margin as a first child, so the section sets its own separation. */
    .districts {
        margin-block-start: 3em;
    }

    /* This heading is a phrase, not the short label Subheader is tuned for, so
       it has to wrap on a narrow screen. Its own `wrap` prop would do it, but
       that also centers the heading, which is wrong above left-aligned prose. */
    .districts :global(h2) {
        white-space: normal;
    }

    /* The call to action is a block after the prose, not part of its last
       paragraph. */
    .districts :global(.biglink) {
        margin-block-start: 1.5em;
    }
</style>
