<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { preferredTranslations } from '@translation/translations';

    export let painting: boolean;
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$preferredTranslations[0].ui.tooltip.place}
    onTip={$preferredTranslations[0].ui.tooltip.paint}
    offLabel="✥"
    onLabel="🖌️"
/>
