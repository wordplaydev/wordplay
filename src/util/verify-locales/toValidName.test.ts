import { expect, test } from 'vitest';
import toValidName from './toValidName';

test('folds underscores into camelCase', () => {
    expect(toValidName('mi_nombre')).toBe('miNombre');
    expect(toValidName('mi_nombre_completo')).toBe('miNombreCompleto');
});

test('folds spaces into camelCase', () => {
    expect(toValidName('mi nombre')).toBe('miNombre');
});

test('collapses mixed/repeated separators', () => {
    expect(toValidName('mi _ nombre')).toBe('miNombre');
    expect(toValidName('mi__nombre')).toBe('miNombre');
});

test('drops leading and trailing separators', () => {
    expect(toValidName('_mi')).toBe('mi');
    expect(toValidName('mi_')).toBe('mi');
    expect(toValidName(' mi ')).toBe('mi');
});

test('handles accented letters', () => {
    expect(toValidName('más_o_menos')).toBe('másOMenos');
});

test('caseless scripts just place glyphs adjacent (toUpperCase no-op)', () => {
    expect(toValidName('あ_い')).toBe('あい');
});

test('leaves an already-valid name unchanged', () => {
    expect(toValidName('miNombre')).toBe('miNombre');
});
