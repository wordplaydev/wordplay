<script lang="ts">
    import type Table from "../runtime/Table";
    import ValueView from "./ValueView.svelte";

    export let value: Table;

</script>

<table>
    <tbody>
        {#each value.rows as row }
            <tr>
                {#each row as cell }
                    <ValueView value={cell}/>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>