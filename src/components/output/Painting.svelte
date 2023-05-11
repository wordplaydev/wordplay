<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { preferredLocales } from '@locale/locales';

    export let painting: boolean;
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$preferredLocales[0].ui.tooltip.place}
    onTip={$preferredLocales[0].ui.tooltip.paint}
    offLabel="✥"
    onLabel="🖌️"
/>
