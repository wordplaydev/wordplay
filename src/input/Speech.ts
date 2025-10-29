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
                console.error('Speech recognition error:', event.error);
                // React with error message so programs can handle it
                if (event.error !== 'no-speech' && event.error !== 'aborted') {
                    this.react(`error:${event.error}`);
                }
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
