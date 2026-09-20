import { expect, test } from 'vitest';
import { diagnose, diagnoseExhaustion } from './diagnose';

// The defect this file exists for (#1077 follow-up): every `network` error was
// reported as "no internet connection", which is wrong in the browsers where it
// happens most — Brave, Arc and other non-Chrome Chromium builds ship the
// SpeechRecognition constructor with no service behind it, so the page loads
// fine and the reader is sent after an internet problem they don't have.
test('a network error while online blames the service, not the connection', () => {
    expect(diagnose('network', false)).toEqual({
        action: 'report',
        error: 'serviceNotAllowed',
        retry: true,
    });
});

test('a network error while offline blames the connection', () => {
    expect(diagnose('network', true)).toEqual({
        action: 'report',
        error: 'noConnection',
        retry: true,
    });
});

// `browserNotSupported` was unreachable before this change: `start()` can only
// test whether the constructor exists, and in these browsers it does. Spending
// the retries while online is the first honest moment to say so.
test('exhausting retries on an unreachable service says the browser is unsupported', () => {
    expect(diagnoseExhaustion(true)).toBe('browserNotSupported');
});

test('exhausting retries on anything else stays generic', () => {
    expect(diagnoseExhaustion(false)).toBe('limit');
});

test.each([
    ['no-speech', 'a pause between words'],
    ['aborted', 'us stopping the stream'],
])('%s is silent because it is %s', (code) => {
    expect(diagnose(code, false)).toEqual({ action: 'ignore' });
});

test('a refused microphone is a permission denial, not a message', () => {
    expect(diagnose('not-allowed', false)).toEqual({ action: 'deny' });
});

// Retrying cannot change whether a language is supported, so this one must not
// burn three attempts and then report the wrong thing.
test('an unsupported language does not retry', () => {
    expect(diagnose('language-not-supported', false)).toEqual({
        action: 'report',
        error: 'languageNotSupported',
        retry: false,
    });
});

test('a microphone hardware failure is retried', () => {
    expect(diagnose('audio-capture', false)).toEqual({
        action: 'report',
        error: 'noMicrophone',
        retry: true,
    });
});

// An unknown code used to claim the reader was offline, which is a guess we
// have no basis for.
test('an unknown code does not claim the reader is offline', () => {
    const result = diagnose('something-new-in-the-spec', false);
    expect(result).toEqual({
        action: 'report',
        error: 'serviceNotAllowed',
        retry: true,
    });
});
