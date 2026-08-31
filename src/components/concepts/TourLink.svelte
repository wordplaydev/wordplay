<script lang="ts">
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { getTourRequest } from '@components/project/Contexts';
    import { isTourID, Tours } from '@components/project/tours';
    import { toursTaken } from '@db/Database';
    import { QUESTION_SYMBOL } from '@parser/Symbols';

    interface Props {
        /** The tour named by a `@Tour/<id>` reference. Not a TourID: an unknown
         *  id is reported as a conflict by ConceptLink, and shown here as the
         *  reference as written rather than silently rendering nothing. */
        id: string;
    }

    let { id }: Props = $props();

    let tour = $derived(isTourID(id) ? Tours[id] : undefined);

    /** Where a tour can actually be started. Undefined on pages with no project
     *  view — the standalone guide, the updates page — where the reference
     *  reads as the invitation it is, with no control that couldn't act. */
    const request = getTourRequest();

    let taken = $derived(isTourID(id) && $toursTaken.includes(id));
</script>

{#if tour === undefined}@Tour/{id}{:else if request === undefined}<LocalizedText
        path={tour.launch}
    />{:else}<span class="tourlink"
        ><Button
            tip={tour.launch}
            uiid="tourLink"
            background
            icon={taken ? '✓' : QUESTION_SYMBOL}
            action={() => {
                if (isTourID(id)) request.id = id;
            }}><LocalizedText path={tour.launch} /></Button
        ></span
    >{/if}

<style>
    /* Inline in a sentence, so it sits on the text baseline rather than
       stretching the line it interrupts. */
    .tourlink {
        display: inline-block;
        vertical-align: middle;
    }
</style>
