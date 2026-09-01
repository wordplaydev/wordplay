<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import Layout, { LayoutIcons } from '@components/project/Layout';
    import Options from '@components/widgets/Options.svelte';
    import { locales, Settings } from '@db/Database';
    import {
        Arrangement,
        ArrangementOrder,
        type ArrangementType,
    } from '@db/settings/Arrangement';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { withMonoEmoji } from '@unicode/emoji';

    interface Props {
        arrangement: ArrangementType;
        canvasWidth: number;
        canvasHeight: number;
    }

    let { arrangement, canvasWidth, canvasHeight }: Props = $props();

    /** The layout actually in effect, which differs from the chosen arrangement
     *  when it's responsive. The closed button shows this, so the footer still
     *  reports what's on screen, while the picker checks the chosen arrangement. */
    const computedLayout = $derived(
        Layout.getComputedLayout(arrangement, canvasWidth, canvasHeight),
    );

    const options: {
        value: ArrangementType;
        label: LocaleTextAccessor;
        tip: LocaleTextAccessor;
        icon: string;
    }[] = $derived(
        ArrangementOrder.map((value, index) => ({
            value,
            label: (l) => l.ui.dialog.settings.mode.layout.labels[index],
            tip: (l) => l.ui.dialog.settings.mode.layout.tips[index],
            icon: LayoutIcons[value],
        })),
    );

    /** Describe the layout in effect, naming the automatic choice when responsive,
     *  since "auto" alone doesn't say what's actually on screen. Primary locale
     *  only: the responsive branch (concretize) already is, and the string
     *  becomes Options' aria-label. */
    const tip = $derived.by(() => {
        const computedTip = $locales.getPrimaryPlainText(
            (l) =>
                l.ui.dialog.settings.mode.layout.tips[
                    ArrangementOrder.indexOf(computedLayout)
                ],
        );
        return arrangement === Arrangement.Responsive
            ? $locales
                  .concretize((l) => l.ui.project.options.layout.auto, {
                      layout: computedTip,
                  })
                  .toText()
            : computedTip;
    });
</script>

<Options
    label={tip}
    value={arrangement}
    {options}
    width="auto"
    pickerWidth="20em"
    change={(value) => {
        // Resolve back to a typed arrangement by lookup rather than a cast.
        const chosen = ArrangementOrder.find((a) => a === value);
        if (chosen !== undefined) Settings.setArrangement(chosen);
    }}
>
    <!-- Only the chosen arrangement, not also what auto resolved to: the footer
         has no horizontal space to spend on a second glyph, and the tip below
         already names the resolved layout. -->
    {#snippet selection()}<span class="icon"
            >{withMonoEmoji(LayoutIcons[arrangement])}</span
        >{/snippet}
    {#snippet item(option, localized)}
        <span class="option">
            <span class="name"
                ><Emoji text={withMonoEmoji(option.icon)} />
                {@render localized(option.label)}</span
            >
            <span class="description">{$locales.getPlainText(option.tip)}</span>
        </span>
    {/snippet}
</Options>

<style>
    .option {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }

    /* The select's button is `display: contents`, so anything here would otherwise
       become a flex item of the select and inherit its gap. Wrapping the icon in
       one item keeps that gap between it and the picker icon, not inside it. */
    .icon {
        display: inline-flex;
        align-items: center;
        /* The mono chain, so this monochrome icon doesn't match a color emoji
           slice and download it. The FE0E selector alone doesn't prevent that. */
        font-family: var(--wordplay-emoji-mono-font);
    }

    .description {
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
        white-space: normal;
    }
</style>
