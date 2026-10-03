import Setting from '#db/settings/Setting.ts';

/**
 * Whether built-in keywords (and the three logical connectives) render as localized words (true)
 * rather than their canonical symbols (false, the default). A render-only display preference: the
 * source keeps whatever the creator typed, a word or a symbol (the tokenizer accepts both through
 * the project's keyword index), and only rendering and copying canonicalize. See LANGUAGE.md.
 *
 * Device-specific (like {@link BlocksSetting}); to make it sync across a creator's devices, set
 * `device` to false and add it to the settings Firebase schema (a versioned migration).
 */
export const WordsSetting = new Setting<boolean>(
    'words',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);
