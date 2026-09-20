<script lang="ts">
    /**
     * The checklist a moderator decides with: one box per rule, each named by
     * the rule it is about.
     *
     * Three surfaces had this — the moderation page and both queues — as the
     * same markup under the same class names, carrying the same four-line
     * explanation of why the boxes align to `start`. A comment copied verbatim
     * three times is the clearest evidence there is that something wanted to be
     * one thing.
     */
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { locales } from '@db/Database';
    import {
        allFlags,
        getFlagDescription,
        withFlag,
        type ModerationState,
    } from '@db/projects/Moderation';

    interface Props {
        /** What is currently ticked. A `null` value is "not decided yet", which
         *  the box shows as indeterminate rather than as unticked. */
        flags: ModerationState;
        /** Called with the whole state each time a box changes. */
        change: (flags: ModerationState) => void;
        /**
         * Prefixed to each checkbox's id. Needed wherever more than one of these
         * can be on the page at once — the queues render one per item — since a
         * repeated id would point every `<label for>` at the first box.
         */
        idPrefix?: string;
    }

    let { flags, change, idPrefix = '' }: Props = $props();
</script>

<div class="stack flags">
    {#each allFlags() as flag (flag)}
        {@const id = `${idPrefix}${flag}`}
        <div class="flag">
            <!-- Named by its own rule. One shared label for all of them left a
                 screen reader unable to tell the boxes apart, which is a
                 checklist that cannot be used without sight. -->
            <Checkbox
                label={(l) => l.moderation.flags[flag]}
                on={flags[flag] === null ? undefined : flags[flag]}
                {id}
                changed={(value) =>
                    change(withFlag(flags, flag, value === true))}
            />
            <label for={id}>
                <MarkupHTMLView
                    markup={getFlagDescription(flag, $locales) ?? ''}
                />
            </label>
        </div>
    {/each}
</div>

<style>
    .flag {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        /* `start`, not `normal` (= stretch): a stretched checkbox floats in the middle
           of a rule that wraps. `Checkbox` sets its own `align-self` too, since it is
           the one place that knows the box's size. */
        align-items: start;
        font-size: medium;
    }
</style>
