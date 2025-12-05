import type { gmail_v1 } from 'googleapis';
import type { Credentials } from 'google-auth-library';

export type GmailListResponse = gmail_v1.Schema$ListMessagesResponse;
export type GmailMessage = gmail_v1.Schema$Message;
export type TokenResponse = Credentials;
