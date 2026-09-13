<!-- How-tos asking to be listed in the guide (#906).

     The decision and its chrome are `ModerationQueue`'s; what is here is the how-to
     itself, which is judged by reading it. Rendered through `MarkupHTMLView` rather
     than the how-to editor: a moderator is reading, not writing, and the editor
     would put the language runtime on this page for no one's benefit.

     Ordered by `moderatedAt`, which the `howToEdited` trigger sets in the same write
     that reaches `pending` — so it is oldest-request-first, and a creator cannot
     pin themselves to the top of it the way a client-written timestamp would let
     them. -->
<script lang="ts">
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import HowTo, {
        HowToSchema,
        HowTosCollection,
        upgradeHowTo,
    } from '@db/howtos/HowToDatabase.svelte';
    import HowToPrompt from '../gallery/[galleryid]/howto/HowToPrompt.svelte';
    import ModerationQueue from './ModerationQueue.svelte';
</script>

<ModerationQueue
    kind="howto"
    collectionName={HowTosCollection}
    order={{ field: 'moderatedAt' }}
    parse={(data) => {
        const parsed = HowToSchema.safeParse(data);
        return parsed.success
            ? new HowTo(upgradeHowTo(parsed.data))
            : undefined;
    }}
    idOf={(howTo) => howTo.getHowToId()}
    text={{
        header: (l) => l.moderation.howto.header,
        done: (l) => l.moderation.howto.done,
        explain: (l) => l.moderation.howto.explain,
        approve: {
            tip: (l) => l.moderation.howto.approve.tip,
            label: (l) => l.moderation.howto.approve.label,
        },
        deny: {
            tip: (l) => l.moderation.howto.deny.tip,
            label: (l) => l.moderation.howto.deny.label,
        },
        skip: {
            tip: (l) => l.moderation.howto.skip.tip,
            label: (l) => l.moderation.howto.skip.label,
        },
    }}
>
    {#snippet content(howTo)}
        {@const questions = howTo.getGuidingQuestions()}
        {@const answers = howTo.getText()}
        <Subheader wrap
            >{howTo.getTitleInLocale($locales.getLocaleString())}</Subheader
        >
        <!-- Question and answer together, because they are written as a pair and
             a moderator judging an answer has to know what it answers. Every
             language it carries, rather than the reader's: a moderator is
             deciding about the whole document. -->
        {#each answers as answer, index (index)}
            {#if answer.trim().length > 0}
                <HowToPrompt text={() => questions[index] ?? ''} compact />
                <MarkupHTMLView markup={answer} />
            {/if}
        {/each}
    {/snippet}
</ModerationQueue>
