<script lang="ts">
    import Switch from '@components/widgets/Switch.svelte';
    import { locales } from '../../db/Database';

    export let painting: boolean;
</script>

<Switch
    on={painting}
    toggle={(on) => (painting = on)}
    offTip={$locales.get((l) => l.ui.output.toggle.paint.off)}
    onTip={$locales.get((l) => l.ui.output.toggle.paint.on)}
    offLabel="✥"
    onLabel="🖌️"
/>
