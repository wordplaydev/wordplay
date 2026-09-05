<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import Options, { type Option } from '@components/widgets/Options.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import { ageOfConsent } from '@db/creators/ageOfConsent';
    import isValidEmail from '@db/creators/isValidEmail';
    import { joinAccount } from '@db/creators/join';
    import { isValidUsername } from '@db/creators/username';
    import { usernameAvailable } from '@db/creators/usernames';
    import { locales } from '@db/Database';
    import { ensureAppCheck, ensureAuth } from '@db/firebase';
    import {
        birthdayFieldOrder,
        birthdayMonthNames,
        birthdayNumber,
        isRealDate,
        toISODate,
    } from '@locale/birthdayFields';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { getLocaleRegions } from '@locale/LocaleText';
    import { Regions } from '@locale/Regions';
    import { RegionNames } from '@locale/regionNames.generated';
    import { SEARCH_SYMBOL } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import { signInWithCustomToken } from 'firebase/auth';
    import isValidPassword from '../login/IsValidPassword';
    import LoginForm from '../login/LoginForm.svelte';

    /**
     * Joining is a short interview before it is a form (#628).
     *
     * We ask where someone lives and when they were born because the age at
     * which someone may consent to us holding an email address is different in
     * different places. Neither answer is kept: the server derives one date —
     * when this creator becomes eligible — and discards the rest. That is the
     * whole reason to ask a birthday rather than "are you over 13?": youth age,
     * and a yes/no answer can't tell us when they stop being a no.
     */
    type Step = 'region' | 'birthday' | 'choose' | 'credentials' | 'sent';

    let step = $state<Step>('region');
    /** 'password' until they choose otherwise, and the only option when they
     *  aren't old enough for the other one. */
    let method = $state<'password' | 'email'>('password');

    /**
     * Where they live, defaulting to the region their locale names — `en-US`
     * starts at the United States, `de-DE` at Germany. A guess, and an
     * overridable one: it saves nearly everyone a scroll through 250 countries,
     * and the answer is not kept anyway. Undefined when the locale carries no
     * region (a bare `en`), so nothing is assumed on their behalf.
     */
    let region = $state<string | undefined>(
        getLocaleRegions($locales.getLocale()).find((code) => code in Regions),
    );
    let year = $state('');
    let month = $state('');
    let day = $state('');

    let username = $state('');
    let password = $state('');
    let password2 = $state('');
    let email = $state('');
    let reveal = $state(false);

    let available: undefined | boolean = $state(undefined);
    let loading = $state(false);
    let checkingUsername = $state(false);
    let feedback: LocaleTextAccessor | undefined = $state(undefined);

    /** The order this reader's locale writes a date in, from the same pinned
     *  CLDR data every other date in Wordplay is formatted with — so the three
     *  fields appear as M/D/Y, D/M/Y, or Y/M/D as the reader expects. */
    const order = $derived(birthdayFieldOrder($locales.getLocale()));
    const months = $derived(birthdayMonthNames($locales.getLocale()));

    /**
     * Countries, named in their own language with an English alternate, from
     * the same list language tags use. Sorted by the reader's own collator.
     *
     * Led by an empty option, because a `<select>` with nothing selected shows
     * its *first* option — so without one, the control would say Afghanistan
     * while the answer was still undefined, and the button below would stay
     * disabled with nothing to explain why.
     */
    const regionOptions: Option[] = $derived([
        {
            value: undefined,
            label: (l) => l.ui.page.join.field.region.placeholder,
        },
        ...Object.keys(Regions)
            .map((code) => ({
                value: code,
                label: RegionNames[code]?.name ?? Regions[code].en,
                tip: Regions[code].en,
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
    ]);

    /**
     * The months, led by an empty option for the same reason.
     *
     * January is the case that made this a bug rather than a cosmetic problem:
     * the control showed January, so choosing January changed nothing and fired
     * no event, and the only way forward was to pick another month and come
     * back. A birthday must never be pre-filled anyway — a date of birth
     * nobody chose is not one to submit.
     */
    const monthOptions: Option[] = $derived([
        {
            value: undefined,
            label: (l) => l.ui.page.join.field.month.placeholder,
        },
        ...Array.from({ length: 12 }, (_, index) => ({
            value: String(index + 1),
            label:
                months?.[index] ??
                birthdayNumber(index + 1, $locales.getLocale()),
        })),
    ]);

    /** A year that could be someone's. Bounded rather than merely four digits:
     *  a typo'd 1089 is not a birthday. */
    const yearValid = $derived(
        /^\d{4}$/.test(year) &&
            Number(year) <= new Date().getUTCFullYear() &&
            new Date().getUTCFullYear() - Number(year) <= 120,
    );

    /** A day that exists in the month and year chosen — which is what makes
     *  February 30th wrong, and February 29th right only sometimes. The message
     *  belongs here because the day is the part that has to change. */
    const dayValid = $derived(
        /^\d{1,2}$/.test(day) &&
            (!yearValid || month === ''
                ? Number(day) >= 1 && Number(day) <= 31
                : isRealDate(Number(year), Number(month), Number(day))),
    );

    const birthdayReal = $derived(
        yearValid &&
            month !== '' &&
            dayValid &&
            isRealDate(Number(year), Number(month), Number(day)),
    );

    /** How old someone must be, where they say they live. */
    const consent = $derived(ageOfConsent(region ?? ''));

    /** Whether they may choose an email address. Re-derived on the server too:
     *  a form is only a suggestion to anyone willing to skip it. */
    const eligible = $derived.by(() => {
        if (!birthdayReal) return false;
        const when = Date.UTC(
            Number(year) + consent,
            Number(month) - 1,
            Number(day),
        );
        return when <= Date.now();
    });

    const credentialsComplete = $derived(
        isValidUsername(username) &&
            available !== false &&
            (method === 'password'
                ? isValidPassword(password) && password === password2
                : isValidEmail(email)),
    );

    async function submit() {
        if (!credentialsComplete || !birthdayReal) return;
        loading = true;
        feedback = undefined;
        try {
            const result = await joinAccount({
                username,
                region: region ?? '',
                birthdate: toISODate(Number(year), Number(month), Number(day)),
                ...(method === 'password' ? { password } : { email }),
                locale: $locales.getLocaleString(),
            });
            if (result.error !== undefined) {
                feedback =
                    result.error === 'username-taken'
                        ? (l) => l.ui.page.join.error.taken
                        : result.error === 'throttled'
                          ? (l) => l.ui.page.join.error.throttled
                          : result.error === 'birthdate-invalid'
                            ? (l) => l.ui.page.join.error.birthday
                            : (l) => l.ui.page.join.error.failed;
                available =
                    result.error === 'username-taken' ? false : available;
                return;
            }
            if (result.token !== undefined) {
                await ensureAppCheck();
                const auth = await ensureAuth();
                if (auth === undefined) {
                    feedback = (l) => l.ui.page.join.error.failed;
                    return;
                }
                await signInWithCustomToken(auth, result.token);
                localeGoto('/profile');
            } else step = 'sent';
        } catch (error) {
            console.error(error);
            feedback = (l) => l.ui.page.join.error.failed;
        } finally {
            loading = false;
        }
    }
</script>

<Header text={(l) => l.ui.page.join.header} />

<LoginForm {feedback}>
    {#if step === 'region'}
        <MarkupHTMLView markup={(l) => l.ui.page.join.prompt.region} />
        <p class="center">
            <Options
                id="region-field"
                value={region}
                label={(l) => l.ui.page.join.field.region.description}
                options={regionOptions}
                change={(value) => (region = value)}
            />
        </p>
        <p class="center">
            <Button
                background
                tip={(l) => l.ui.page.join.button.next.tip}
                label={(l) => l.ui.page.join.button.next.label}
                active={region !== undefined}
                action={() => {
                    step = 'birthday';
                }}
                testid="join-next"
            />
        </p>
    {:else if step === 'birthday'}
        <MarkupHTMLView markup={(l) => l.ui.page.join.prompt.birthday} />
        <p class="center birthday">
            {#each order as field (field)}
                {#if field === 'year'}
                    <TextField
                        id="birth-year-field"
                        description={(l) =>
                            l.ui.page.join.field.year.description}
                        placeholder={(l) =>
                            l.ui.page.join.field.year.placeholder}
                        bind:text={year}
                        editable={!loading}
                        validator={(text) =>
                            text === '' || yearValid
                                ? true
                                : (l) => l.ui.page.join.error.birthday}
                    />
                {:else if field === 'month'}
                    <Options
                        id="birth-month-field"
                        value={month === '' ? undefined : month}
                        label={(l) => l.ui.page.join.field.month.description}
                        options={monthOptions}
                        change={(value) => (month = value ?? '')}
                    />
                {:else}
                    <TextField
                        id="birth-day-field"
                        description={(l) =>
                            l.ui.page.join.field.day.description}
                        placeholder={(l) =>
                            l.ui.page.join.field.day.placeholder}
                        bind:text={day}
                        editable={!loading}
                        validator={(text) =>
                            text === '' || dayValid
                                ? true
                                : (l) => l.ui.page.join.error.birthday}
                    />
                {/if}
            {/each}
        </p>
        <p class="center buttons">
            <Button
                tip={(l) => l.ui.page.join.button.back.tip}
                label={(l) => l.ui.page.join.button.back.label}
                action={() => {
                    step = 'region';
                }}
            />
            <Button
                background
                tip={(l) => l.ui.page.join.button.next.tip}
                label={(l) => l.ui.page.join.button.next.label}
                active={birthdayReal}
                action={() => {
                    // Someone too young for an email address is never offered
                    // one, and never shown a date counting down to it — the
                    // copy names an age instead.
                    if (!eligible) {
                        method = 'password';
                        step = 'credentials';
                    } else step = 'choose';
                }}
                testid="join-next"
            />
        </p>
    {:else if step === 'choose'}
        <MarkupHTMLView markup={(l) => l.ui.page.join.prompt.choose} />
        <MarkupHTMLView
            note
            markup={(l) => l.ui.page.join.prompt.withPassword}
        />
        <p class="center">
            <Button
                background
                tip={(l) => l.ui.page.join.button.usePassword.tip}
                label={(l) => l.ui.page.join.button.usePassword.label}
                action={() => {
                    method = 'password';
                    step = 'credentials';
                }}
                testid="join-use-password"
            />
        </p>
        <MarkupHTMLView note markup={(l) => l.ui.page.join.prompt.withEmail} />
        <p class="center">
            <Button
                background
                tip={(l) => l.ui.page.join.button.useEmail.tip}
                label={(l) => l.ui.page.join.button.useEmail.label}
                action={() => {
                    method = 'email';
                    step = 'credentials';
                }}
                testid="join-use-email"
            />
        </p>
    {:else if step === 'credentials'}
        <MarkupHTMLView markup={(l) => l.ui.page.join.prompt.create} />
        {#if !eligible}
            <MarkupHTMLView
                note
                markup={[
                    (l) => l.ui.page.join.prompt.tooYoung,
                    { age: consent },
                ]}
            />
        {/if}

        <MarkupHTMLView note markup={(l) => l.ui.page.join.prompt.username} />
        <p class="center">
            <TextField
                id="username-field"
                description={(l) => l.ui.page.login.field.username.description}
                placeholder={(l) => l.ui.page.login.field.username.placeholder}
                bind:text={username}
                editable={!loading}
                validator={(text) =>
                    !isValidUsername(text)
                        ? (l) => l.ui.page.login.error.invalidUsername
                        : available === false
                          ? (l) => l.ui.page.login.error.usernameTaken
                          : true}
                changed={() => {
                    if (available === false) available = undefined;
                }}
                dwelled={async (text) => {
                    checkingUsername = true;
                    // Only a definite "no" marks it taken. An undefined answer
                    // means we couldn't ask, and the claim itself will decide.
                    available = (await usernameAvailable(text)) !== false;
                    checkingUsername = false;
                }}
            />
            <Spinning size={1} spin={checkingUsername}></Spinning>
        </p>

        {#if method === 'password'}
            <MarkupHTMLView
                note
                markup={(l) => l.ui.page.join.prompt.password}
            />
            <p class="center">
                <TextField
                    id="password-field"
                    kind={reveal ? undefined : 'password'}
                    description={(l) =>
                        l.ui.page.login.field.password.description}
                    placeholder={(l) =>
                        l.ui.page.login.field.password.placeholder}
                    bind:text={password}
                    editable={!loading}
                    validator={(pass) =>
                        !isValidPassword(pass)
                            ? (l) => l.ui.page.login.error.invalidPassword
                            : true}
                />
                <TextField
                    id="password-repeat-field"
                    kind={reveal ? undefined : 'password'}
                    description={(l) =>
                        l.ui.page.login.field.password.description}
                    placeholder={(l) =>
                        l.ui.page.login.field.password.placeholder}
                    bind:text={password2}
                    editable={!loading}
                    validator={(pass) =>
                        !isValidPassword(pass)
                            ? (l) => l.ui.page.login.error.invalidPassword
                            : pass !== password
                              ? (l) => l.ui.page.login.error.mismatched
                              : true}
                />
                <Toggle
                    tips={(l) => l.ui.page.login.toggle.reveal}
                    on={reveal}
                    toggle={() => (reveal = !reveal)}>{SEARCH_SYMBOL}</Toggle
                >
            </p>
        {:else}
            <p class="center">
                <TextField
                    id="join-email-field"
                    kind="email"
                    description={(l) => l.ui.page.join.field.email.description}
                    placeholder={(l) => l.ui.page.join.field.email.placeholder}
                    bind:text={email}
                    editable={!loading}
                    validator={(text) =>
                        !isValidEmail(text)
                            ? (l) => l.ui.page.login.error.email
                            : true}
                />
            </p>
        {/if}

        <p class="center">
            {#if loading}
                <Spinning></Spinning>
            {:else}
                <Button
                    background
                    submit
                    tip={(l) => l.ui.page.login.button.login}
                    active={credentialsComplete}
                    action={submit}
                    label={(l) => l.ui.page.join.header}
                    testid="join-button"
                />
            {/if}
        </p>
    {:else}
        <!-- Deliberately the same message whether or not that address already
             had an account: this page never says which. -->
        <MarkupHTMLView markup={(l) => l.ui.page.join.prompt.sent} />
    {/if}
</LoginForm>

<style>
    .center {
        text-align: center;
    }

    .buttons {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
        justify-content: center;
    }

    .birthday {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: baseline;
        justify-content: center;
    }
</style>
