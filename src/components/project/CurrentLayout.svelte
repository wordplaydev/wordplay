<script lang="ts">
    import { locales } from '@db/Database';
    import Arrangement from '@db/settings/Arrangement';
    import { withMonoEmoji } from '../../unicode/emoji';
    import { getTip } from './Contexts';
    import Layout, { LayoutIcons } from './Layout';

    interface Props {
        arrangement: Arrangement;
        canvasWidth: number;
        canvasHeight: number;
    }

    let { arrangement, canvasWidth, canvasHeight }: Props = $props();

    // Get the tip context
    let tip = getTip();

    const computedLayout = $derived(
        Layout.getComputedLayout(arrangement, canvasWidth, canvasHeight),
    );

    const label = $derived(
        $locales.get(
            (l) =>
                l.ui.dialog.settings.mode.layout.labels[
                    Object.values(Arrangement).indexOf(computedLayout)
                ],
        ),
    );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
    aria-label={label}
    onpointerenter={(event) => tip.show(label, event.currentTarget)}
    onpointerleave={() => tip.hide()}
    >{withMonoEmoji(LayoutIcons[computedLayout])}
</span>

<style>
    span {
        cursor: default;
    }
</style>
