<script lang="ts">
    import { page } from '$app/state';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import HowTo from '@db/howtos/HowToDatabase.svelte';

    interface Props {
        howToId: string;
    }

    let { howToId }: Props = $props();
    const galleryID = decodeURI(page.params.galleryid);

    // let howTo: HowTo = await HowTos.getHowTo(howToId, galleryID);
    let howTo: HowTo = new HowTo({
        id: 'howto3',
        timestamp: 0,
        galleryId: 'gallery1',
        published: true,
        xcoord: 500,
        ycoord: 500,
        title: 'How to make a cake',
        guidingQuestions: ['tell us the story of how you learned this'],
        text: ['do another thing'],
        creator: 'donut',
        collaborators: [],
        locales: ['en-US'],
        reactions: new Map<string, string[]>(),
        usedByProjects: [],
        chat: null,
    });

    let show: boolean = $state(false);
</script>

<Dialog
    bind:show
    header={(l) => l.ui.howto.newHowTo.form.header}
    explanation={(l) => l.ui.howto.newHowTo.form.explanation}
    button={{
        tip: (l) => l.ui.howto.newHowTo.add.tip,
        icon: '👀',
        large: true,
    }}
>
    <Subheader text={(l) => l.ui.howto.newHowTo.prompt} />

    <MarkupHTMLView markup={(l) => howTo.getText()} />
</Dialog>
