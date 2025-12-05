/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for a Scheduled Worker: a Worker that can run on a
 * configurable interval:
 * https://developers.cloudflare.com/workers/platform/triggers/cron-triggers/
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"` to see your Worker in action
 * - Run `npm run deploy` to publish your Worker
 *
 * Bind resources to your Worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { GmailListResponse, GmailMessage, TokenResponse } from './types';

export default {
	async fetch(req) {
		const url = new URL(req.url);
		url.pathname = '/__scheduled';
		url.searchParams.append('cron', '* * * * *');
		return new Response(`To test the scheduled handler, ensure you have used the "--test-scheduled" then try running "curl ${url.href}".`);
	},

	// The scheduled handler is invoked at the interval set in our wrangler.jsonc's
	// [[triggers]] configuration.
	async scheduled(event, env, ctx): Promise<void> {
		console.log('Running Gmail cron…');

		const accessToken = await getAccessToken(env);

		const searchRes = await gmailListEmails(accessToken, 'from:@krungthai.com newer_than:1d');

		if (!searchRes.messages) {
			console.log('No relevant emails');
			return;
		}

		for (const msg of searchRes.messages) {
			const { id } = msg;
			if (!id) {
				continue;
			}

			// 4. Fetch the full email
			const email = await gmailGetEmail(accessToken, id);
			const text = extractText(email);

			console.log(email);

			console.log(text);
		}

		console.log('Done.');
	},
} satisfies ExportedHandler<Env>;

/**
 * Fetches an access token from Google OAuth by exchanging the refresh token in the Cloudflare environment.
 * @param env The Cloudflare environment object containing the refresh token.
 * @returns A promise that resolves with the access token.
 * @throws Error If the request to get the access token fails or if the access token is not present in the response.
 */
async function getAccessToken(env: Env) {
	const url = 'https://oauth2.googleapis.com/token';

	const params = new URLSearchParams();
	params.set('client_id', env.GOOGLE_CLIENT_ID);
	params.set('client_secret', env.GOOGLE_CLIENT_SECRET);
	params.set('refresh_token', env.GOOGLE_REFRESH_TOKEN);
	params.set('grant_type', 'refresh_token');

	const res = await fetch(url, {
		method: 'POST',
		body: params,
	});

	if (!res.ok) {
		throw new Error('Failed to get access token');
	}

	const { access_token } = await res.json<TokenResponse>();
	if (!access_token) {
		throw new Error('Failed to get access token');
	}

	return access_token;
}

/**
 * Lists Gmail emails based on a query.
 * @param token The access token to be used to authenticate the request.
 * @param query The query string to be used to filter the emails.
 * @returns A promise that resolves with the list of emails.
 * @throws Error If the request to list emails fails.
 */
async function gmailListEmails(token: string, query: string) {
	const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`;

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!res.ok) {
		throw new Error('Failed to list emails');
	}

	return res.json<GmailListResponse>();
}

/**
 * Fetches a Gmail email by ID.
 * @param token The access token to be used to authenticate the request.
 * @param id The Gmail email ID.
 * @returns A promise that resolves with the email.
 * @throws Error If the request to get the email fails.
 */
async function gmailGetEmail(token: string, id: string) {
	const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;

	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (!res.ok) {
		throw new Error('Failed to get email');
	}

	return res.json<GmailMessage>();
}

function extractText(msg: GmailMessage): string {
	const parts = msg.payload?.parts || [];
	const textPart = parts.find((p: any) => p.mimeType === 'text/plain');
	if (!textPart?.body?.data) return '';

	// Gmail encodes email body with URL-safe base64
	return atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
}
