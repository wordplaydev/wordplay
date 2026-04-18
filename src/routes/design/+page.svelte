<script lang="ts">
    import { browser } from '$app/environment';
    import Header from '../../components/app/Header.svelte';
    import Link from '../../components/app/Link.svelte';
    import Notice from '../../components/app/Notice.svelte';
    import Subheader from '../../components/app/Subheader.svelte';
    import Writing from '../../components/app/Writing.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
    import Button from '../../components/widgets/Button.svelte';
    import LocalizedText from '../../components/widgets/LocalizedText.svelte';
    import Mode from '../../components/widgets/Mode.svelte';
    import Note from '../../components/widgets/Note.svelte';
    import Switch from '../../components/widgets/Switch.svelte';
    import Toggle from '../../components/widgets/Toggle.svelte';
    import Warning from '../../components/widgets/Warning.svelte';
    import { dark, locales, Settings } from '../../db/Database';

    // Demo state for interactive component examples
    let toggleOn = $state(false);
    let modeChoice = $state(0);

    // Computed CSS values — updated reactively whenever dark mode changes
    let colorHex = $state<Record<string, string>>({});
    let spacingPx = $state<Record<string, string>>({});
    let appFontStack = $state('');
    let codeFontStack = $state('');

    // Derive localized switch labels from the existing dark-mode locale strings
    let lightLabel = $derived(
        $locales.getPlainText((l) => l.ui.dialog.settings.mode.dark.labels[0]),
    );
    let darkLabel = $derived(
        $locales.getPlainText((l) => l.ui.dialog.settings.mode.dark.labels[1]),
    );

    function rgbToHex(rgb: string): string {
        const match = rgb.match(
            /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/,
        );
        if (!match) return rgb;
        const r = Math.round(parseFloat(match[1]));
        const g = Math.round(parseFloat(match[2]));
        const b = Math.round(parseFloat(match[3]));
        const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
        const hex = [r, g, b]
            .map((n) => n.toString(16).padStart(2, '0'))
            .join('');
        if (a < 1) {
            const alpha = Math.round(a * 255)
                .toString(16)
                .padStart(2, '0');
            return `#${hex}${alpha}`;
        }
        return `#${hex}`;
    }

    function resolveColor(name: string): string {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.visibility = 'hidden';
        el.style.backgroundColor = `var(${name})`;
        document.body.appendChild(el);
        const computed = getComputedStyle(el).backgroundColor;
        document.body.removeChild(el);
        return rgbToHex(computed);
    }

    function resolveLength(name: string): string {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.visibility = 'hidden';
        el.style.width = `var(${name})`;
        document.body.appendChild(el);
        const computed = getComputedStyle(el).width;
        document.body.removeChild(el);
        return computed;
    }

    $effect(() => {
        $dark; // reactive dependency — recompute on theme change
        if (!browser) return;

        const newColors: Record<string, string> = {};
        for (const c of [...paletteColors, ...semanticColors]) {
            newColors[c.name] = resolveColor(c.name);
        }
        colorHex = newColors;

        appFontStack = getComputedStyle(document.documentElement)
            .getPropertyValue('--wordplay-app-font')
            .trim();
        codeFontStack = getComputedStyle(document.documentElement)
            .getPropertyValue('--wordplay-code-font')
            .trim();

        const newSpacing: Record<string, string> = {};
        for (const v of spacingVariables) {
            newSpacing[v.name] = v.canCompute ? resolveLength(v.name) : '';
        }
        spacingPx = newSpacing;
    });

    function primaryFont(stack: string): string {
        return stack.split(',')[0].trim().replace(/['"]/g, '');
    }

    const paletteColors: { name: string; value: string }[] = [
        { name: '--color-blue', value: 'var(--color-blue)' },
        { name: '--color-purple', value: 'var(--color-purple)' },
        { name: '--color-pink', value: 'var(--color-pink)' },
        { name: '--color-orange', value: 'var(--color-orange)' },
        { name: '--color-yellow', value: 'var(--color-yellow)' },
        { name: '--color-white', value: 'var(--color-white)' },
        { name: '--color-black', value: 'var(--color-black)' },
        { name: '--color-light-grey', value: 'var(--color-light-grey)' },
        {
            name: '--color-very-light-grey',
            value: 'var(--color-very-light-grey)',
        },
        { name: '--color-dark-grey', value: 'var(--color-dark-grey)' },
        { name: '--color-shadow', value: 'var(--color-shadow)' },
    ];

    const semanticColors: {
        name: string;
        value: string;
        description: (l: import('@locale/LocaleText').default) => string;
    }[] = [
        {
            name: '--wordplay-foreground',
            value: 'var(--wordplay-foreground)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-background',
            value: 'var(--wordplay-background)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-header',
            value: 'var(--wordplay-header)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-chrome',
            value: 'var(--wordplay-chrome)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-border-color',
            value: 'var(--wordplay-border-color)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-evaluation-color',
            value: 'var(--wordplay-evaluation-color)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-highlight-color',
            value: 'var(--wordplay-highlight-color)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-focus-color',
            value: 'var(--wordplay-focus-color)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-hover',
            value: 'var(--wordplay-hover)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-error',
            value: 'var(--wordplay-error)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-warning',
            value: 'var(--wordplay-warning)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-inactive-color',
            value: 'var(--wordplay-inactive-color)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-alternating-color',
            value: 'var(--wordplay-alternating-color)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-doc-color',
            value: 'var(--wordplay-doc-color)',
            description: (l) => l.ui.page.design.col.description,
        },
        {
            name: '--wordplay-relation-color',
            value: 'var(--wordplay-relation-color)',
            description: (l) => l.ui.page.design.col.description,
        },
    ];

    // Only spacing variables used across multiple components
    const spacingVariables: {
        name: string;
        cssValue: string;
        canCompute: boolean;
    }[] = [
        { name: '--wordplay-spacing', cssValue: '0.5em', canCompute: true },
        {
            name: '--wordplay-spacing-half',
            cssValue: '0.25em',
            canCompute: true,
        },
        {
            name: '--wordplay-border-radius',
            cssValue: '8px',
            canCompute: true,
        },
        { name: '--wordplay-border-width', cssValue: '1px', canCompute: true },
        { name: '--wordplay-focus-width', cssValue: '4px', canCompute: true },
        {
            name: '--wordplay-widget-height',
            cssValue: '1.5em',
            canCompute: true,
        },
    ];
</script>

<Writing>
    <Header text={(l) => l.ui.page.design.header} />
    <div class="section-content">
        <MarkupHTMLView markup={(l) => l.ui.page.design.description} />
    </div>

    <!-- Theme -->
    <Subheader text={(l) => l.ui.page.design.theme} />
    <div class="section-content">
        <Switch
            on={$dark === true}
            toggle={(on) => Settings.setDark(on)}
            offLabel={`☼ ${lightLabel}`}
            onLabel={`☽ ${darkLabel}`}
            offTip={(l) => l.ui.dialog.settings.mode.dark.tips[0]}
            onTip={(l) => l.ui.dialog.settings.mode.dark.tips[1]}
            shortcut={undefined}
        />
    </div>

    <!-- Colors -->
    <Subheader text={(l) => l.ui.page.design.colors} />

    <h3><LocalizedText path={(l) => l.ui.page.design.palette} /></h3>
    <div class="section-content">
        <div class="swatch-grid">
            {#each paletteColors as color}
                <div class="swatch-item">
                    <div class="swatch" style:background={color.value}></div>
                    <code class="var-name">{color.name}</code>
                    {#if colorHex[color.name]}
                        <code class="hex-value">{colorHex[color.name]}</code>
                    {/if}
                </div>
            {/each}
        </div>
    </div>

    <h3><LocalizedText path={(l) => l.ui.page.design.semantic} /></h3>
    <div class="section-content">
        <table>
            <thead>
                <tr>
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.variable}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.color}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.hex}
                        /></th
                    >
                </tr>
            </thead>
            <tbody>
                {#each semanticColors as color}
                    <tr>
                        <td><code>{color.name}</code></td>
                        <td>
                            <div
                                class="swatch small"
                                style:background={color.value}
                            ></div>
                        </td>
                        <td><code>{colorHex[color.name] ?? '–'}</code></td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <!-- Fonts -->
    <Subheader text={(l) => l.ui.page.design.fonts} />

    <div class="section-content">
        <table>
            <thead>
                <tr>
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.variable}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.cssvalue}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.primaryface}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.preview}
                        /></th
                    >
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>--wordplay-app-font</code></td>
                    <td
                        ><code class="font-stack">{appFontStack || '…'}</code
                        ></td
                    >
                    <td
                        ><code
                            >{appFontStack
                                ? primaryFont(appFontStack)
                                : '…'}</code
                        ></td
                    >
                    <td
                        ><span class="font-preview app-font"
                            >Aa 0123 The quick brown fox</span
                        ></td
                    >
                </tr>
                <tr>
                    <td><code>--wordplay-code-font</code></td>
                    <td
                        ><code class="font-stack">{codeFontStack || '…'}</code
                        ></td
                    >
                    <td
                        ><code
                            >{codeFontStack
                                ? primaryFont(codeFontStack)
                                : '…'}</code
                        ></td
                    >
                    <td
                        ><span class="font-preview code-font"
                            >Aa 0123 The quick brown fox</span
                        ></td
                    >
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Spacing -->
    <Subheader text={(l) => l.ui.page.design.spacing} />
    <div class="section-content">
        <table>
            <thead>
                <tr>
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.variable}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.cssvalue}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.computed}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.preview}
                        /></th
                    >
                </tr>
            </thead>
            <tbody>
                {#each spacingVariables as v}
                    <tr>
                        <td><code>{v.name}</code></td>
                        <td><code>{v.cssValue}</code></td>
                        <td
                            ><code
                                >{v.canCompute
                                    ? (spacingPx[v.name] ?? '…')
                                    : '–'}</code
                            ></td
                        >
                        <td>
                            {#if v.canCompute}
                                <div class="spacing-bar-wrap">
                                    <div
                                        class="spacing-bar"
                                        style:width={`var(${v.name})`}
                                        style:height={`var(${v.name})`}
                                    ></div>
                                </div>
                            {/if}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>

    <Subheader text={(l) => l.ui.page.design.typography} />

    <div class="type-specimen">
        <table>
            <tbody>
                <tr>
                    <td><code>Header.svelte</code></td>
                    <td>
                        <Header block={false}>
                            <LocalizedText
                                path={(l) => l.ui.page.design.demo.header}
                            />
                        </Header>
                    </td>
                </tr>
                <tr>
                    <td><code>Subheader.svelte</code></td>
                    <td>
                        <Subheader>
                            <LocalizedText
                                path={(l) => l.ui.page.design.demo.subheader}
                            />
                        </Subheader>
                    </td>
                </tr>
                <tr>
                    <td><code>Link.svelte</code></td>
                    <td>
                        <Link
                            to="/about"
                            label={(l) => l.ui.page.about.header}
                        />
                    </td>
                </tr>
            </tbody>
        </table></div
    >

    <!-- Components -->
    <Subheader text={(l) => l.ui.page.design.components} />
    <div class="section-content">
        <table>
            <thead>
                <tr>
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.component}
                        /></th
                    >
                    <th
                        ><LocalizedText
                            path={(l) => l.ui.page.design.col.preview}
                        /></th
                    >
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><code>Button.svelte</code></td>
                    <td>
                        <Button
                            tip={() =>
                                $locales.getPlainText(
                                    (l) => l.ui.page.design.demo.button,
                                )}
                            action={() => {}}
                            background
                        >
                            <LocalizedText
                                path={(l) => l.ui.page.design.demo.button}
                            />
                        </Button>
                    </td>
                </tr>
                <tr>
                    <td><code>Mode.svelte</code></td>
                    <td>
                        <Mode
                            modes={() => ({
                                label: 'Example mode',
                                labels: ['One', 'Two', 'Three'] as const,
                                tips: [
                                    'Option one',
                                    'Option two',
                                    'Option three',
                                ] as const,
                            })}
                            choice={modeChoice}
                            select={(i) => (modeChoice = i)}
                        />
                    </td>
                </tr>
                <tr>
                    <td><code>Switch.svelte</code></td>
                    <td>
                        <Switch
                            on={false}
                            toggle={() => {}}
                            offLabel={`☼ ${lightLabel}`}
                            onLabel={`☽ ${darkLabel}`}
                            offTip={(l) =>
                                l.ui.dialog.settings.mode.dark.tips[0]}
                            onTip={(l) =>
                                l.ui.dialog.settings.mode.dark.tips[1]}
                            shortcut={undefined}
                        />
                    </td>
                </tr>
                <tr>
                    <td><code>Toggle.svelte</code></td>
                    <td>
                        <Toggle
                            tips={(l) => ({
                                on: l.ui.page.design.demo.toggleon,
                                off: l.ui.page.design.demo.toggleoff,
                            })}
                            on={toggleOn}
                            toggle={() => (toggleOn = !toggleOn)}
                        >
                            <LocalizedText
                                path={(l) => l.ui.page.design.demo.button}
                            />
                        </Toggle>
                    </td>
                </tr>
                <tr>
                    <td><code>Note.svelte</code></td>
                    <td>
                        <Note
                            ><LocalizedText
                                path={(l) => l.ui.page.design.demo.note}
                            /></Note
                        >
                    </td>
                </tr>
                <tr>
                    <td><code>Warning.svelte</code></td>
                    <td>
                        <Warning
                            ><LocalizedText
                                path={(l) => l.ui.page.design.demo.warning}
                            /></Warning
                        >
                    </td>
                </tr>
                <tr>
                    <td><code>Notice.svelte</code></td>
                    <td>
                        <Notice
                            ><LocalizedText
                                path={(l) => l.ui.page.design.demo.notice}
                            /></Notice
                        >
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</Writing>

<style>
    .section-content {
        margin-block-start: var(--wordplay-spacing);
        margin-block-end: calc(2 * var(--wordplay-spacing));
    }

    .swatch-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(7em, 1fr));
        gap: var(--wordplay-spacing);
    }

    .swatch-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing-half);
    }

    .swatch {
        width: 3em;
        height: 3em;
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        flex-shrink: 0;
    }

    .swatch.small {
        width: 1.5em;
        height: 1.5em;
    }

    .var-name {
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-small-font-size);
        word-break: break-all;
        text-align: center;
    }

    .hex-value {
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-small-font-size);
        color: var(--wordplay-inactive-color);
    }

    .font-preview {
        font-size: 1.1em;
    }

    .app-font {
        font-family: var(--wordplay-app-font);
    }

    .code-font {
        font-family: var(--wordplay-code-font);
    }

    .font-stack {
        word-break: break-all;
        white-space: normal;
    }

    .spacing-bar-wrap {
        display: flex;
        align-items: center;
        min-height: 1em;
        min-width: 1em;
    }

    .spacing-bar {
        background: var(--wordplay-focus-color);
        min-width: 1px;
        min-height: 1px;
        border-radius: var(--wordplay-border-radius);
        flex-shrink: 0;
    }

    /* Typography specimen shown above the component table */
    .type-specimen {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        margin-block-end: var(--wordplay-spacing);
        overflow: hidden;
    }

    table {
        width: 100%;
        margin-block-end: var(--wordplay-spacing);
    }

    code {
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-small-font-size);
    }

    h3 {
        margin-top: calc(2 * var(--wordplay-spacing));
        margin-bottom: 1em;
    }
</style>
