import type { Request } from 'firebase-functions/v2/https';
import type express from 'express';
import * as http from 'http';
import * as https from 'https';

export default async function getWebpage(
    request: Request,
    response: express.Response,
): Promise<void> {
    const url: string | undefined =
        'url' in request.query && typeof request.query.url === 'string'
            ? decodeURI(request.query['url'])
            : undefined;

    const lib =
        url === undefined
            ? undefined
            : url.startsWith('https://')
              ? https
              : http;

    // Cache the response for 10 minutes to minimize requests.
    response.set('Cache-Control', 'public, max-age=600, s-maxage=600');

    if (lib === undefined || url === undefined) {
        console.log('Invalid URL ' + url);
        response.json('invalid-url');
        return;
    }

    const result: string = await new Promise((resolve) => {
        lib.get(url, (resp) => {
            const contentType = resp.headers['content-type'];
            if (resp.statusCode !== 200) {
                console.error(`GET status: Code: ${resp.statusCode}`);
                resolve('not-available');
            } else if (!contentType?.startsWith('text/html')) {
                console.error(`GET received ${contentType}`);
                resolve('not-html');
            }

            let data = '';

            resp.on('data', (chunk) => {
                data += chunk;
            });

            resp.on('end', () => {
                console.log('GET success');
                resolve(data);
            });
        }).on('error', (err) => {
            console.error('GET error: ' + err.message);
            resolve('not-available');
        });
    });

    response.set('Content-Length', `${new Blob([result]).size}`);

    response.json(result);
}
