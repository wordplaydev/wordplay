import type Evaluation from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import StreamValue from '@values/StreamValue';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import type Locales from '../locale/Locales';
import StreamDefinition from '../nodes/StreamDefinition';
import StreamType from '../nodes/StreamType';
import TextType from '../nodes/TextType';
import TextValue from '../values/TextValue';
import createStreamEvaluator from './createStreamEvaluator';

// Types for Web Speech API (browser compatibility handling)
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

/** A stream of recognized speech as text, allowing for voice-based programming. */
export default class Speech extends StreamValue<TextValue, string> {
    readonly evaluator: Evaluator;

    on = true;
    recognition: SpeechRecognition | undefined;
    isListening = false;
    languageCode: string;
    retryCount = 0;
    maxRetries = 3;
    retryDelay = 1000; // Start with 1 second
    retryTimeout: NodeJS.Timeout | number | undefined;

    constructor(evaluation: Evaluation, languageCode?: string) {
        super(
            evaluation,
            evaluation.getEvaluator().project.shares.input.Speech,
            new TextValue(evaluation.getCreator(), ''),
            '',
        );

        this.evaluator = evaluation.getEvaluator();
        // Default to English if no language provided
        this.languageCode = languageCode || 'en-US';
    }

    configure() {
        return;
    }

    react(text: string) {
        // Only add the event if stream is on
        if (this.on)
            this.add(new TextValue(this.evaluator.getMain(), text), text);
    }

    start() {
        this.on = true;

        // Check browser support
        if (typeof window === 'undefined') return;

        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) {
            console.warn('Speech recognition not supported in this browser.');
            return;
        }

        // Create recognition instance if not exists
        if (!this.recognition) {
            this.recognition = new SpeechRecognitionAPI();
            this.recognition.continuous = true; // Keep listening
            this.recognition.interimResults = false; // Only final results
            this.recognition.maxAlternatives = 1; // Only best match
            this.recognition.lang = this.languageCode;
            console.log(
                'Speech recognition initialized with language:',
                this.languageCode,
            );

            // Handle results
            this.recognition.onresult = (event: SpeechRecognitionEvent) => {
                const results = event.results;
                const resultIndex = event.resultIndex;

                // Get the transcript from the most recent result
                if (results[resultIndex] && results[resultIndex].isFinal) {
                    const transcript =
                        results[resultIndex][0].transcript.trim();
                    console.log('Speech recognized:', transcript);
                    if (transcript) {
                        this.react(transcript);
                    }
                }
            };

            // Handle errors
            this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                console.error(
                    'Speech recognition error:',
                    event.error,
                    event.message,
                );
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
                console.warn('Recognition already started');
            }
        }
    }

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

    private handleError(error: string, message: string) {
        // Handle specific error types with appropriate messages and retry logic
        switch (error) {
            case 'network':
                // Network error - could be no internet or service unavailable
                this.react(
                    'Network error: Check your internet connection and try again.',
                );
                this.attemptRetry('network');
                break;

            case 'not-allowed':
            case 'service-not-allowed':
                // Permission denied - user needs to grant microphone access
                this.react(
                    'Permission denied: Please allow microphone access in your browser settings.',
                );
                // Don't retry permission errors
                this.stop();
                break;

            case 'audio-capture':
                // Microphone hardware error
                this.react(
                    'Microphone error: Check that your microphone is connected and working.',
                );
                this.attemptRetry('audio-capture');
                break;

            case 'language-not-supported':
                // Language not supported by the browser
                this.react(
                    `Language not supported: ${this.languageCode} is not available for speech recognition.`,
                );
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

            case 'bad-grammar':
                // Grammar compilation error (shouldn't happen in our case)
                this.react('Speech recognition configuration error.');
                break;

            default:
                // Unknown error - show generic message
                this.react(
                    `Other error: ${error}${message ? ' - ' + message : ''}`,
                );
                this.attemptRetry('unknown');
                break;
        }
    }

    private attemptRetry(errorType: string) {
        // Only retry for transient errors, and only up to max retries
        if (this.retryCount < this.maxRetries && this.on) {
            this.retryCount++;
            const delay = this.retryDelay * this.retryCount; // Exponential backoff
            console.log(
                `Attempting to restart speech recognition in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries}) after ${errorType} error`,
            );

            this.retryTimeout = setTimeout(() => {
                if (this.on && !this.isListening) {
                    try {
                        this.recognition?.start();
                    } catch (e) {
                        console.error('Failed to restart recognition:', e);
                    }
                }
            }, delay);
        } else if (this.retryCount >= this.maxRetries) {
            // Max retries reached
            this.react(
                'Speech recognition failed after multiple attempts. Please try again later.',
            );
            this.stop();
        }
    }

    getType() {
        return StreamType.make(TextType.make());
    }
}

export function createSpeechDefinition(locales: Locales) {
    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Speech.doc),
        getNameLocales(locales, (locale) => locale.input.Speech.names),
        [],
        createStreamEvaluator(
            TextType.make(),
            Speech,
            (evaluation) => {
                // Get the user's preferred locale for speech recognition
                const preferredLocale = evaluation
                    .getEvaluator()
                    .getLocales()[0];
                const languageCode = preferredLocale
                    ? `${preferredLocale.language}${preferredLocale.regions.map((r) => `-${r}`).join('')}`
                    : 'en-US';
                return new Speech(evaluation, languageCode);
            },
            (stream) => stream.configure(),
        ),
        TextType.make(),
    );
}
