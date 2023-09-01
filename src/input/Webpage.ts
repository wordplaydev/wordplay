import StreamValue from '@values/StreamValue';
import type Evaluator from '@runtime/Evaluator';
import StreamDefinition from '../nodes/StreamDefinition';
import { getDocLocales } from '../locale/getDocLocales';
import { getNameLocales } from '../locale/getNameLocales';
import Bind from '../nodes/Bind';
import TextType from '../nodes/TextType';
import TextValue from '../values/TextValue';
import StreamType from '../nodes/StreamType';
import createStreamEvaluator from './createStreamEvaluator';
import type Locale from '../locale/Locale';
import ListValue from '../values/ListValue';
import NoneValue from '../values/NoneValue';
import ListType from '../nodes/ListType';
import TextLiteral from '../nodes/TextLiteral';
import NumberType from '../nodes/NumberType';
import Unit from '../nodes/Unit';
import NumberLiteral from '../nodes/NumberLiteral';
import NumberValue from '../values/NumberValue';
import UnionType from '../nodes/UnionType';
import NoneType from '../nodes/NoneType';
import MessageException from '../values/MessageException';
import type ExceptionValue from '../values/ExceptionValue';

/**
 * Webpage stream values can be one of three things:
 * 1) an HTML string (text), converted into a list of text
 * 2) an HTTP error code string defined below
 * 3) undefined, which means loading
 */
type FetchResponse = { url: string; response: string | undefined };

const FetchErrors = {
    'invalid-url': (locale: Locale) => locale.input.Webpage.error.invalid,
    'not-available': (locale: Locale) => locale.input.Webpage.error.unvailable,
    'not-html': (locale: Locale) => locale.input.Webpage.error.notHTML,
    'no-connection': (locale: Locale) =>
        locale.input.Webpage.error.noConnection,
};

export type FetchError = keyof typeof FetchErrors;

/** Raw inputs are either an HTML string or a HTTP response code number */
export default class Webpage extends StreamValue<
    ListValue | NoneValue | ExceptionValue,
    FetchResponse
> {
    url: string;
    query: string;
    frequency: number;
    timeout: NodeJS.Timeout | undefined = undefined;

    constructor(
        evaluator: Evaluator,
        url: string,
        query: string,
        frequency: number
    ) {
        super(
            evaluator,
            evaluator.project.shares.input.Webpage,
            new NoneValue(evaluator.project.shares.input.Webpage),
            { url, response: undefined }
        );

        this.url = url.trim();
        this.query = query.trim();
        this.frequency = frequency;
    }

    configure(url: string, query: string, frequency: number) {
        this.url = url.trim();
        this.query = query.trim();
        this.frequency = frequency;
    }

    react(event: FetchResponse) {
        // Cache the response
        URLResponseCache.set(event.url, { response: event, time: Date.now() });

        // See if it's an error, and if so, produce an exception.
        const error = FetchErrors[event.response as FetchError];
        if (error)
            return this.add(
                new MessageException(
                    this.evaluator.project.shares.input.Webpage,
                    this.evaluator,
                    error(this.evaluator.project.locales[0])
                ),
                event
            );

        if (event.response === undefined) {
            return this.add(new NoneValue(this.creator), event);
        }
        try {
            const doc = new DOMParser().parseFromString(
                event.response,
                'text/html'
            );
            const text = (
                this.query === ''
                    ? doc.body.innerText.split('\n')
                    : Array.from(doc.querySelectorAll(this.query)).map((n) =>
                          n instanceof HTMLElement ? n.innerText : ''
                      )
            )
                .map((t) => t.trim())
                .filter((t) => t !== '')
                .map((t) => new TextValue(this.creator, t));
            return this.add(new ListValue(this.creator, text), event);
        } catch (error) {
            console.error(
                error !== null &&
                    typeof error === 'object' &&
                    'message' in error &&
                    typeof error.message === 'string'
                    ? error.message
                    : '?'
            );
            this.add(
                new MessageException(
                    this.creator,
                    this.evaluator,
                    FetchErrors['unparsable' as FetchError](
                        this.evaluator.project.locales[0]
                    )
                ),
                event
            );
        }
    }

    start() {
        this.get();
    }

    stop() {
        this.resetTimeout();
        return;
    }

    resetTimeout() {
        if (this.timeout) clearTimeout(this.timeout);
    }

    async get() {
        // Do we have a recent cache?
        const cache = URLResponseCache.get(this.url);

        // Less than a minute old? Reuse it.
        let html: string | undefined;
        if (cache && Date.now() - cache.time < 1000 * 60) {
            html = cache.response.response;
        } else {
            // Not a valid URL?
            if (
                !/(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})? /.test(
                    this.url
                )
            ) {
                html = 'invalid-url';
                return;
            }

            html = await this.evaluator.database.getHTML(this.url);
        }

        this.react({ url: this.url, response: html ?? 'no-connection' });

        // Get it again in the next period.
        this.resetTimeout();
        this.timeout = setTimeout(
            () => this.get(),
            Math.max(1, this.frequency) * 60 * 1000
        );
    }

    getType() {
        return StreamType.make(
            UnionType.make(ListType.make(TextType.make()), NoneType.make())
        );
    }
}

export function createWebpageDefinition(locales: Locale[]) {
    const url = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Webpage.url.doc),
        getNameLocales(locales, (locale) => locale.input.Webpage.url.names),
        TextType.make()
    );

    const query = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Webpage.query.doc),
        getNameLocales(locales, (locale) => locale.input.Webpage.query.names),
        TextType.make(),
        TextLiteral.make('')
    );

    const frequency = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Webpage.frequency.doc),
        getNameLocales(
            locales,
            (locale) => locale.input.Webpage.frequency.names
        ),
        NumberType.make(Unit.create(['min'])),
        NumberLiteral.make('1', Unit.create(['min']))
    );

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Webpage.doc),
        getNameLocales(locales, (locale) => locale.input.Webpage.names),
        [url, query, frequency],
        createStreamEvaluator(
            UnionType.make(ListType.make(TextType.make()), NoneType.make()),
            Webpage,
            (evaluation) =>
                new Webpage(
                    evaluation.getEvaluator(),
                    evaluation.get(url.names, TextValue)?.text ?? '',
                    evaluation.get(query.names, TextValue)?.text ?? '',
                    evaluation.get(frequency.names, NumberValue)?.toNumber() ??
                        1
                ),
            (stream, evaluation) =>
                stream.configure(
                    evaluation.get(url.names, TextValue)?.text ?? '',
                    evaluation.get(query.names, TextValue)?.text ?? '',
                    evaluation.get(frequency.names, NumberValue)?.toNumber() ??
                        1
                )
        ),
        UnionType.make(ListType.make(TextType.make()), NoneType.make())
    );
}

/** A global cache of requests to avoid hammering servers during editing and debugging */
const URLResponseCache = new Map<
    string,
    { response: FetchResponse; time: number }
>();
