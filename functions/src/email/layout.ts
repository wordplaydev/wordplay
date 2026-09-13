import {
    BodyWidth,
    BorderWidth,
    Dark,
    FontSize,
    FontStack,
    FontWeight,
    Light,
    Radius,
    SmallFontSize,
    type EmailScheme,
} from './theme.js';

/**
 * The one Wordplay email template.
 *
 * Both emails used to be a string literal where they were sent, which is how
 * the sign-in mail came to use a `#e06c00` that is in no palette and whose
 * white label measures 3.3:1 — under the AA floor the rest of the app is held
 * to. A message now declares *blocks* and this renders them, so the HTML and
 * the plain-text alternative come from one list and cannot drift apart.
 *
 * Every visual property is an inline `style` with a literal value: Gmail does
 * not resolve custom properties, and its app strips `<style>` entirely for
 * non-Google accounts. The `<style>` block is progressive enhancement only.
 */

export type EmailBlock =
    | { kind: 'heading'; text: string }
    | { kind: 'paragraph'; text: string }
    /** A call to action. Its URL is always also rendered as visible text. */
    | { kind: 'button'; label: string; url: string }
    /** A bare URL, shown so it can be copied when a button can't be pressed. */
    | { kind: 'url'; url: string }
    /** Quieter text: a disclaimer, a footnote, an attribution. */
    | { kind: 'note'; text: string }
    /** A labelled fact, for mail whose body is really a small record. */
    | { kind: 'field'; label: string; value: string };

export type EmailMessage = {
    subject: string;
    /** BCP-47 tag for `<html lang>`; undefined falls back to English. */
    language: string | undefined;
    /** The line a client shows beside the subject in a list. */
    preheader: string;
    blocks: EmailBlock[];
    /** Where to change whether this kind of mail arrives, when it is optional. */
    manageURL: string | undefined;
    manageLabel: string | undefined;
};

export function escape(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Languages written right to left, for `<html dir>`. A mirror of the same
 * answer `src/locale/LanguageCode.ts` gives, held to it by
 * `emailDirectionSync.test.ts`; three shipped locales need it and the old
 * template declared neither `lang` nor `dir`.
 */
export const RTLLanguages: ReadonlySet<string> = new Set([
    'ar',
    'arc',
    'ckb',
    'dv',
    'fa',
    'ha',
    'he',
    'khw',
    'ks',
    'ps',
    'sd',
    'ur',
    'uz',
    'yi',
]);

export function directionOf(locale: string | undefined): 'ltr' | 'rtl' {
    if (locale === undefined) return 'ltr';
    const language = locale.split(/[-_]/)[0]?.toLowerCase() ?? '';
    return RTLLanguages.has(language) ? 'rtl' : 'ltr';
}

/**
 * The masthead is the wordmark as text, with no image beside it.
 *
 * Every way of putting the speech-bubble mark in an email fails one of the
 * tests that matter. Inline SVG is stripped by Gmail. A PNG cannot take its
 * color from the page, so the opaque white app tile stays a white tile on a
 * dark ground, and the transparent one is a black mark invisible on it — and
 * swapping two images behind `prefers-color-scheme` only works in the one
 * client that already honors it. Images are blocked by default for an unknown
 * sender anyway. Text inverts by construction, is never blocked, and weighs
 * nothing.
 */

function fontRule(size: string, color: string, weight = FontWeight): string {
    return `margin:0;font-family:${FontStack};font-size:${size};font-weight:${weight};line-height:1.5;color:${color}`;
}

/**
 * One block as HTML.
 *
 * Every element that declares a color also carries a **role class**, and the
 * dark block below overrides that class. Both halves are needed: the inline
 * color is what survives Gmail, which resolves no custom property and strips
 * `<style>` for non-Google accounts, and the class is the only way Apple Mail
 * can paint the dark palette — an inline color on a descendant beats a rule on
 * its ancestor however emphatic, so a blanket `.wp-body` override never reaches
 * it. Shipping the class on only some of them is how the wordmark came to be
 * black on black while `.wp-dim` and `.wp-link` were declared and never used.
 */
function blockHTML(block: EmailBlock, scheme: EmailScheme): string {
    const { background, foreground, dimmed, link, border, action, actionText } =
        scheme;
    switch (block.kind) {
        case 'heading':
            // The -1deg rotation every h1-h3 in the app carries lives in the
            // <style> class, not here, so it degrades to nothing rather than to
            // a stripped attribute everywhere but Apple Mail.
            //
            // No background of its own: a rotated box paints outside its layout
            // box, and an opaque one clipped the top of whatever followed. The
            // cell behind it declares the ground, which is what the
            // dark-inversion rule actually needs.
            return `<h1 class="wp-h wp-text" style="${fontRule('16pt', foreground, '700')};padding-bottom:18px">${escape(block.text)}</h1>`;
        case 'paragraph':
            return `<p class="wp-text" style="${fontRule(FontSize, foreground)};background-color:${background};padding-bottom:16px">${escape(block.text)}</p>`;
        case 'note':
            return `<p class="wp-dim" style="${fontRule(SmallFontSize, dimmed)};background-color:${background};padding-bottom:16px">${escape(block.text)}</p>`;
        case 'field':
            return `<p class="wp-text" style="${fontRule(FontSize, foreground)};background-color:${background};padding-bottom:12px"><span class="wp-dim" style="color:${dimmed}">${escape(block.label)}</span><br/>${escape(block.value)}</p>`;
        case 'url':
            return `<p class="wp-dim" style="${fontRule(SmallFontSize, dimmed)};background-color:${background};padding-bottom:16px;word-break:break-all"><a class="wp-link" href="${escape(block.url)}" style="color:${link}">${escape(block.url)}</a></p>`;
        case 'button': {
            // The app's salient button is gold with literal black text and a 1px
            // hard offset shadow. `box-shadow` is dropped by Outlook's Word
            // engine, so the shadow is a cell painted the border color that the
            // button sits one pixel up and left of — boxes, which every client
            // can do.
            const label = `<a href="${escape(block.url)}" style="display:block;padding:10px 20px;${fontRule(FontSize, actionText)};background-color:${action};text-decoration:none">${escape(block.label)}</a>`;
            return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="padding-bottom:16px"><tr><td style="background-color:${border};border-radius:${Radius};padding:0 1px 1px 0"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="background-color:${action};border:${BorderWidth} solid ${border};border-radius:${Radius}">${label}</td></tr></table></td></tr></table>`;
        }
    }
}

function blockText(block: EmailBlock): string {
    switch (block.kind) {
        case 'heading':
        case 'paragraph':
        case 'note':
            return block.text;
        case 'field':
            return `${block.label}: ${block.value}`;
        case 'url':
            return block.url;
        case 'button':
            // The label alone would lose the destination, and the plain-text
            // part is all some clients show.
            return `${block.label}: ${block.url}`;
    }
}

/** Enough invisible filler that body copy can't leak into a client's preview
 *  line after the preheader. */
const PreheaderPadding = '&#847;&zwnj;&nbsp;'.repeat(30);

export function renderEmail(message: EmailMessage): {
    subject: string;
    html: string;
    text: string;
} {
    const language = message.language ?? 'en-US';
    const dir = directionOf(message.language);
    const body = message.blocks
        .map((block) => blockHTML(block, Light))
        .join('\n');

    const manage =
        message.manageURL === undefined || message.manageLabel === undefined
            ? ''
            : `\n<p class="wp-dim" style="${fontRule(SmallFontSize, Light.dimmed)};background-color:${Light.background};padding-top:8px"><a class="wp-link" href="${escape(message.manageURL)}" style="color:${Light.link}">${escape(message.manageLabel)}</a></p>`;

    // Only Apple Mail and iOS honor prefers-color-scheme; Gmail and Outlook.com
    // invert on their own regardless. The metas stop Apple's partial inversion;
    // the app's neutrals survive everyone else's by construction.
    // Only Apple Mail and iOS honor prefers-color-scheme; Gmail and Outlook.com
    // invert on their own regardless. One rule per role rather than a blanket
    // one over `p`, which flattened a note and a bare URL to full foreground and
    // lost the dimming that tells them apart.
    const style = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
.wp-h { transform: rotate(-1deg); }
@media (prefers-color-scheme: dark) {
  .wp-page { background-color: ${Dark.background} !important; }
  .wp-body { background-color: ${Dark.background} !important; }
  .wp-text, .wp-mark { background-color: ${Dark.background} !important; color: ${Dark.foreground} !important; }
  .wp-dim { background-color: ${Dark.background} !important; color: ${Dark.dimmed} !important; }
  .wp-link { color: ${Dark.link} !important; }
  .wp-rule { border-color: ${Dark.border} !important; }
}`;

    const html = `<!doctype html>
<html lang="${escape(language)}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light dark"/>
<meta name="supported-color-schemes" content="light dark"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/>
<title>${escape(message.subject)}</title>
<style>${style}</style>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
</head>
<body class="wp-page" style="margin:0;padding:0;background-color:${Light.background}">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:transparent">${escape(message.preheader)}${PreheaderPadding}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${Light.background}"><tr><td align="center" style="padding:24px 16px">
<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${BodyWidth}"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="${BodyWidth}" style="width:100%;max-width:${BodyWidth}px;text-align:${dir === 'rtl' ? 'right' : 'left'}">
<tr><td class="wp-body" style="background-color:${Light.background};padding-bottom:16px">
<span class="wp-mark" style="${fontRule('14pt', Light.foreground, '700')};letter-spacing:0.02em">Wordplay</span>
</td></tr>
<tr><td class="wp-rule" style="border-top:${BorderWidth} solid ${Light.border};font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td class="wp-body" style="background-color:${Light.background};padding-top:20px">
${body}${manage}
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body>
</html>`;

    const text = [
        ...message.blocks.map(blockText),
        ...(message.manageURL === undefined ? [] : [message.manageURL]),
    ].join('\n\n');

    return { subject: message.subject, html, text: `${text}\n` };
}
