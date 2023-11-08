<script lang="ts">
    import Header from '../../components/app/Header.svelte';
    import { locales } from '../../db/Database';
    import UsernameLogin from './UsernameLogin.svelte';
    import EmailLogin from './EmailLogin.svelte';
</script>

<!-- Provide some reasons to log in -->
<Header>{$locales.get((l) => l.ui.page.login.header)}</Header>

<p>
    {$locales.get((l) => l.ui.page.login.prompt.login)}
</p>
<UsernameLogin />
<EmailLogin />
