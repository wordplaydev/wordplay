import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import StreamValue from '@values/StreamValue';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import type Locales from '../locale/Locales';
import type LocaleText from '../locale/LocaleText';
import Bind from '../nodes/Bind';
import BooleanType from '../nodes/BooleanType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import NumberType from '../nodes/NumberType';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import TextLiteral from '../nodes/TextLiteral';
import TextType from '../nodes/TextType';
import UnionType from '../nodes/UnionType';
import TextValue from '../values/TextValue';
import createStreamEvaluator from './createStreamEvaluator';

// Types for Web Speech API (browser compatibility handling)
// The Web Speech API is *NOT* fully typed in TypeScript's lib.dom.d.ts
// Browser implementations vary between standard and webkit-prefixed
// These interfaces below provide type safety for the subset of the API that we use
// Helpful links:
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
// https://wicg.github.io/speech-api/
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult:
        | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
        | null;
    onerror:
        | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
        | null;
}

interface SpeechRecognitionStatic {
    new (): SpeechRecognition;
}

declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}

// Localized error messages for speech recognition errors
// Each key maps to a locale accessor function
// Modeled after Webpage
const SpeechErrors = {
    browserNotSupported: (locale: LocaleText) => locale.input.Speech.error.browserNotSupported,
    noConnection: (locale: LocaleText) => locale.input.Speech.error.noConnection,
    serviceNotAllowed: (locale: LocaleText) => locale.input.Speech.error.serviceNotAllowed,
    micNotAllowed: (locale: LocaleText) => locale.input.Speech.error.micNotAllowed,
    noMicrophone: (locale: LocaleText) => locale.input.Speech.error.noMicrophone,
    languageNotSupported: (locale: LocaleText) => locale.input.Speech.error.languageNotSupported,
    limit: (locale: LocaleText) => locale.input.Speech.error.limit,
};

export type SpeechError = keyof typeof SpeechErrors;

export default class Speech extends StreamValue<TextValue, string> {
    // Reference to Wordplay evaluator for values and project context
    readonly evaluator: Evaluator;

    // Tracker of whether the Stream is accepting speech input
    on = true;

    // The Web Speech API instance
    // It is initialized on start()
    recognition: SpeechRecognition | undefined;

    // Tracker of whether start() has been called and not yet ended
    isListening = false;

    // BCP-47 language code
    languageCode: string;

    // Max number of words to retain (sliding window)
    // As new words are added, old words are dropped
    // Undefined means infinite accumulation
    wordLimit: number | undefined;

    // Current number of retry attempts for errors
    retryCount = 0;

    // Max number of retry attempts for errors
    maxRetries = 3;

    // The based relay in ms for retry backoff
    // It is multiplied by the number of retry attempts
    retryDelay = 1000;

    // Handle for pending retry timeout
    // It is used for cleanup on stop()
    retryTimeout: NodeJS.Timeout | number | undefined;

    // Tracker of the last reset parameter value
    // It prevents repeated resets while the reset parameter is true
    lastResetValue: boolean | undefined = undefined;

    // Creates a Speech Stream instance
    constructor(
        evaluation: Evaluation, // The current Wordplay context
        languageCode?: string, // The BCP-47 language code, which defaults to 'en-US'
        wordLimit?: number, // Max number of words to retain (sliding window), which defaults to infinite
    ) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Speech,
            new TextValue(evaluation.getCreator(), ''),
            '',
        );

        // Defines default behavior
        this.evaluator = evaluation.getEvaluator();
        this.languageCode = languageCode || 'en-US';
        this.wordLimit = wordLimit;
    }

    // Updates stream configuration when parameters change
    // Called by the stream evaluator
    // The stream only clears when reset transitions from false to true
    configure(reset: boolean | undefined, limit: number | undefined) {
        // Updates word limit if changed
        this.wordLimit = limit;

        // If reset is true AND we haven't already handled this reset
        if (reset === true && this.lastResetValue !== true) {
            // Reset the stream to empty text
            this.add(new TextValue(this.evaluator.getMain(), ''), '');
            this.lastResetValue = true;
        } else if (reset !== true) {
            // Reset was de-selected, allow next reset
            this.lastResetValue = false;
        }
        // If reset is still true but we already handled it, do nothing
    }

    // Processes new speech input and updates Stream values
    // Strategy for text accumulation:
    // 1. Append new text to existing accumulated text, separated by space
    // 2. If word limit is set, keep only the N most recent words
    // 3. Set the new accumulated text as the Stream's current value
    // Note: This becomes an NLP problem for certain languages
    react(text: string) {
        // Only add the event when Stream is on
        if (this.on) {
            // Get the current accumulated text
            const current = this.latest();
            const currentText =
                current instanceof TextValue ? current.text : '';
            // Append the new text with a space if there's existing text
            let accumulated = currentText ? `${currentText} ${text}` : text;

            // Apply sliding window if word limit is set
            if (this.wordLimit !== undefined && this.wordLimit > 0) {
                const words = accumulated.split(/\s+/);
                if (words.length > this.wordLimit) {
                    // Keep only the N most recent words
                    accumulated = words.slice(-this.wordLimit).join(' ');
                }
            }

            this.add(
                new TextValue(this.evaluator.getMain(), accumulated),
                accumulated,
            );
        }
    }

    // Resolves a localized error message, and pushes it as the stream's text value
    // This makes errors visible on stage in the user's language
    // Modeled after Webpage
    private reactError(errorKey: SpeechError) {
        const localeText = this.evaluator.getLocales()[0];
        const message = SpeechErrors[errorKey](localeText);
        this.react(message);
    }

    // Initializes and starts the Web Speech API
    // Lifecycle:
    // 1. Check for browser support
    // 2. Create SpeechRecognition instance if it doesn't exist
    // 3. Configure for continuous listening
    // 4. Set up event handlers for (1) results, (2) errors, and (3) lifecycle events
    // 5. Start recognition if it's not listening already
    start() {
        this.on = true;

        // Check browser support
        if (typeof window === 'undefined') return;

        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            this.reactError('browserNotSupported');
            return;
        }

        // Create recognition instance if not exists
        if (!this.recognition) {
            this.recognition = new SpeechRecognitionAPI();
            this.recognition.continuous = true;      // Keep listening until stopped
            this.recognition.interimResults = false; // Only final results
            this.recognition.maxAlternatives = 1;    // Only best match
            this.recognition.lang = this.languageCode;

            // Handle results
            this.recognition.onresult = (event: SpeechRecognitionEvent) => {
                const results = event.results;
                const resultIndex = event.resultIndex;

                // Get the transcript from the most recent result
                if (results[resultIndex] && results[resultIndex].isFinal) {
                    const transcript =
                        results[resultIndex][0].transcript.trim();
                    if (transcript) {
                        this.react(transcript);
                    }
                }
            };

            // Handle errors
            this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                this.handleError(event.error, event.message);
            };

            // Handle end (restart if still on)
            this.recognition.onend = () => {
                this.isListening = false;
                // Restart if we're supposed to be listening
                if (this.on) {
                    try {
                        this.recognition?.start();
                        this.isListening = true;
                    } catch (e) {
                        // Already started, ignore
                    }
                }
            };

            // Handle start
            this.recognition.onstart = () => {
                this.isListening = true;
                // Reset retry count on successful start
                this.retryCount = 0;
                this.retryDelay = 1000;
            };
        }

        // Start recognition
        if (!this.isListening) {
            try {
                this.recognition.start();
            } catch (e) {
                // Already started, ignore
            }
        }
    }

    // Stops speech recognition and cleans up
    // Cleaning up includes:
    // 1. Setting the flags to prevent auto restart
    // 2. Clearing all pending retry timeouts
    // 3. Stopping the speech recognition instance
    // It is idempotent - safe to call multiple times
    stop() {
        this.on = false;
        this.isListening = false;
        // Clear any pending retry
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout as number);
            this.retryTimeout = undefined;
        }
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {
                // Already stopped, ignore
            }
        }
    }

    setLanguage(languageCode: string) {
        this.languageCode = languageCode;
        if (this.recognition) {
            this.recognition.lang = languageCode;
        }
    }

    // Handles Web Speech API errors with localized messages
    // This should cover *ALL* possible errors in the API docs:
    // https://webaudio.github.io/web-speech-api/#speechreco-error
    private handleError(error: string, _message: string) {
        switch (error) {
            case 'network':
                // Network error - could be no internet or service unavailable
                this.reactError('noConnection');
                this.attemptRetry('network');
                break;

            case 'service-not-allowed':
                // Service denied - API quota/rate limit or service unavailable
                this.reactError('serviceNotAllowed');
                this.attemptRetry('service-not-allowed');
                break;

            case 'not-allowed':
                // Permission denied - user needs to grant microphone access
                this.reactError('micNotAllowed');
                // Don't retry permission errors - user action required
                this.stop();
                break;

            case 'audio-capture':
                // Microphone hardware error
                this.reactError('noMicrophone');
                this.attemptRetry('audio-capture');
                break;

            case 'language-not-supported':
                // Language not supported by the browser (unlikely but possible)
                this.reactError('languageNotSupported');
                // Don't retry language errors
                this.stop();
                break;

            case 'no-speech':
                // No speech detected - this is normal, don't show error
                // Just continue listening
                break;

            case 'aborted':
                // User or system aborted - don't show error
                break;

            default:
                // Unknown error - surface as a connection error since most unexpected speech errors are network/service related
                this.reactError('noConnection');
                this.attemptRetry('unknown');
                break;
        }
    }

    // Retry logic
    // Backoff strategy: delay = baseDelay * attemptnumber
    // Attempt 1: 1000ms; Attempt 2: 2000ms; Attempt 3: 3000ms
    // After [maxRetries] failures, it injects a localized error message and stops the stream
    private attemptRetry(errorType: string) {
        // Only retry for transient errors, and only up to max retries
        if (this.retryCount < this.maxRetries && this.on) {
            this.retryCount++;
            const delay = this.retryDelay * this.retryCount;

            this.retryTimeout = setTimeout(() => {
                if (this.on && !this.isListening) {
                    try {
                        this.recognition?.start();
                    } catch (e) {
                        // Restart failed — surface to user and give up
                        this.reactError('limit');
                        this.stop();
                    }
                }
            }, delay);
        } else if (this.retryCount >= this.maxRetries) {
            this.reactError('limit');
            this.stop();
        }
    }

    getType() {
        return StreamType.make(TextType.make());
    }
}

// Creates the Wordplay StreamDefinition for the Speech Stream
// It defines how the Speech Stream appears in the WordPlay language
// Parameters as affordances to users:
// 1. reset: ⊤|ø
// 2. language: ""∣ø
// 3. limit: #|ø
export function createSpeechDefinition(locales: Locales) {
    const resetBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Speech.reset.doc),
        getNameLocales(locales, (locale) => locale.input.Speech.reset.names),
        UnionType.make(BooleanType.make(), NoneType.make()),
        NoneLiteral.make(),
    );

    const languageBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Speech.language.doc),
        getNameLocales(locales, (locale) => locale.input.Speech.language.names),
        UnionType.make(TextType.make(), NoneType.make()),
        // Default to 'en-US' if no language specified
        TextLiteral.make('en-US'),
    );

    const limitBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Speech.limit.doc),
        getNameLocales(locales, (locale) => locale.input.Speech.limit.names),
        UnionType.make(NumberType.make(), NoneType.make()),
        // Default to none (unlimited)
        NoneLiteral.make(),
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Speech.doc),
        getNameLocales(locales, (locale) => locale.input.Speech.names),
        [resetBind, languageBind, limitBind],
        createStreamEvaluator(
            TextType.make(),
            Speech,
            (evaluation) => {
                // Get the language from the parameter, default to 'en-US'
                const languageCode =
                    evaluation.get(languageBind.names, TextValue)?.text ??
                    'en-US';
                // Get the word limit (undefined = unlimited)
                const wordLimit = evaluation
                    .get(limitBind.names, NumberValue)
                    ?.toNumber();
                return new Speech(evaluation, languageCode, wordLimit);
            },
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(resetBind.names, BoolValue)?.bool,
                    evaluation.get(limitBind.names, NumberValue)?.toNumber(),
                ),
        ),
        TextType.make(),
    );
}
