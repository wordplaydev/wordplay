<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { locale } from '../../db/Database';

    export let painting: boolean;
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$locale.ui.output.toggle.paint.off}
    onTip={$locale.ui.output.toggle.paint.on}
    offLabel="✥"
    onLabel="🖌️"
/>
