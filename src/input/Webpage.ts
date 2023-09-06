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
    'reached-limit': (locale: Locale) => locale.input.Webpage.error.limit,
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
                    ? getTextInNode(doc.body)
                    : Array.from(doc.querySelectorAll(this.query)).map((n) =>
                          n instanceof HTMLElement ? n.innerText : ''
                      )
            )
                .map((t) =>
                    t.replaceAll('\\n', '').replaceAll('\\t', '').trim()
                )
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
                html = 'no-connection';
            }

            // Update request data for this domain.
            const domain = new URL(this.url).hostname;
            // Get the counts data
            const counts = DomainCounts[domain] ?? {
                time: Date.now(),
                count: 0,
            };
            const elapsed = Date.now() - counts.time;
            // If time is more than 24 hours ago, reset the clock.
            if (elapsed > 1000 * 60 * 60 * 24) {
                counts.time = Date.now();
                counts.count = 0;
            } else counts.count++;

            DomainCounts[domain] = counts;

            // If local storage exists, save it.
            if (typeof localStorage !== 'undefined')
                localStorage.setItem(
                    'domainRequests',
                    JSON.stringify(DomainCounts)
                );

            // console.error(
            //     `${counts.count} requests to ${domain} in the last 24 hour window`
            // );
            // console.error(
            //     `${
            //         (1000 * counts.count) / elapsed
            //     } requests per second to ${domain}`
            // );

            // If the total number of requests is more than 1000, or more than 10 per second, refuse
            if (
                counts.count > 1000 ||
                (elapsed > 0 && counts.count / elapsed > 10 * 1000)
            ) {
                html = 'reached-limit';
                return;
            } else {
                html = await this.evaluator.database.getHTML(this.url);
            }
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

type DomainData = {
    /** The time at which counting began. Once we exceed 24 hours from this, we reset count and the time. */
    time: number;
    /** The number of requests made to the domain since time was marked. */
    count: number;
};

/**
 * Data by domain to help with rate limiting.
 * */
const DomainCounts: Record<string, DomainData> =
    typeof localStorage !== 'undefined'
        ? JSON.parse(localStorage.getItem('domainRequests') ?? '{}')
        : {};

/** A function that gets a node's text nodes, except for style and script tags */
function getTextInNode(node: HTMLElement) {
    let child: Node | null;
    const text = [];
    const walk = document.createTreeWalker(node, NodeFilter.SHOW_ALL, (n) => {
        return n.nodeName === 'SCRIPT' || n.nodeName === 'STYLE'
            ? NodeFilter.FILTER_REJECT
            : n.nodeType === Node.TEXT_NODE
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
    });
    do {
        child = walk.nextNode();
        if (child && child.nodeType === Node.TEXT_NODE && child.textContent)
            text.push(child.textContent);
    } while (child);
    return text;
}
