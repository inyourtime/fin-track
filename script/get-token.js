import readline from 'readline';
import { google } from 'googleapis';
import fs from 'fs';

const credentials = JSON.parse(fs.readFileSync('client_secret.json'));
const { client_id, client_secret, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Gmail read-only scope
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const authUrl = oAuth2Client.generateAuthUrl({
	access_type: 'offline', // REQUIRED for refresh_token
	prompt: 'consent', // Force refresh_token on first login
	scope: SCOPES,
});

console.log('Visit this URL to authorize:');
console.log(authUrl);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question('Enter the code from the page: ', async (code) => {
	const { tokens } = await oAuth2Client.getToken(code);
	console.log('Tokens:');
	console.log(tokens);

	// tokens.refresh_token = what you need
	rl.close();
});
