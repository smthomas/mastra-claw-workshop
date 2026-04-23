import { google, gmail_v1 } from 'googleapis';

let gmailClient: gmail_v1.Gmail | null = null;
let oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.compose',
] as const;

export type EmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  snippet: string;
  body: string;
  labels: string[];
  isUnread: boolean;
  isStarred: boolean;
};

export type EmailSummary = Omit<EmailMessage, 'to' | 'body'>;

export type GmailLabel = {
  id: string;
  name: string;
};

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required Gmail environment variable: ${name}`);
  }

  return value;
}

export function getOAuth2Client() {
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      requireEnv('GMAIL_CLIENT_ID'),
      requireEnv('GMAIL_CLIENT_SECRET'),
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    );

    const refreshToken = requireEnv('GMAIL_REFRESH_TOKEN');
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

export function getGmailClient(): gmail_v1.Gmail {
  if (!gmailClient) {
    gmailClient = google.gmail({ version: 'v1', auth: getOAuth2Client() });
  }

  return gmailClient;
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const header = headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function decodeBody(data: string | undefined | null): string {
  if (!data) {
    return '';
  }

  try {
    return Buffer.from(data, 'base64url').toString('utf-8');
  } catch {
    return '';
  }
}

function getBodyFromParts(parts: gmail_v1.Schema$MessagePart[] | undefined): string {
  if (!parts) {
    return '';
  }

  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBody(part.body.data);
    }

    const nestedBody = getBodyFromParts(part.parts);
    if (nestedBody) {
      return nestedBody;
    }
  }

  for (const part of parts) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBody(part.body.data);
    }

    const nestedBody = getBodyFromParts(part.parts);
    if (nestedBody) {
      return nestedBody;
    }
  }

  return '';
}

async function getMessageSummaries(messages: gmail_v1.Schema$Message[] | undefined): Promise<EmailSummary[]> {
  const gmail = getGmailClient();

  if (!messages?.length) {
    return [];
  }

  return Promise.all(
    messages.map(async (message) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = fullMessage.data.payload?.headers;
      const labels = fullMessage.data.labelIds || [];

      return {
        id: fullMessage.data.id!,
        threadId: fullMessage.data.threadId!,
        from: getHeader(headers, 'From'),
        subject: getHeader(headers, 'Subject'),
        date: getHeader(headers, 'Date'),
        snippet: fullMessage.data.snippet || '',
        labels,
        isUnread: labels.includes('UNREAD'),
        isStarred: labels.includes('STARRED'),
      };
    }),
  );
}

export async function fetchUnreadEmails(maxResults = 10): Promise<EmailSummary[]> {
  const gmail = getGmailClient();
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread in:inbox',
    maxResults,
  });

  return getMessageSummaries(response.data.messages);
}

export async function fetchStarredEmails(maxResults = 10): Promise<EmailSummary[]> {
  const gmail = getGmailClient();
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:starred',
    maxResults,
  });

  return getMessageSummaries(response.data.messages);
}

export async function getEmailContent(emailId: string): Promise<EmailMessage> {
  const gmail = getGmailClient();
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: emailId,
    format: 'full',
  });

  const headers = response.data.payload?.headers;
  const labels = response.data.labelIds || [];

  let body = '';
  if (response.data.payload?.body?.data) {
    body = decodeBody(response.data.payload.body.data);
  } else if (response.data.payload?.parts) {
    body = getBodyFromParts(response.data.payload.parts);
  }

  return {
    id: response.data.id!,
    threadId: response.data.threadId!,
    from: getHeader(headers, 'From'),
    to: getHeader(headers, 'To')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    subject: getHeader(headers, 'Subject'),
    date: getHeader(headers, 'Date'),
    snippet: response.data.snippet || '',
    body,
    labels,
    isUnread: labels.includes('UNREAD'),
    isStarred: labels.includes('STARRED'),
  };
}

async function modifyMessage(emailId: string, requestBody: gmail_v1.Schema$ModifyMessageRequest) {
  const gmail = getGmailClient();
  await gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    requestBody,
  });

  return getEmailContent(emailId);
}

export async function starEmail(emailId: string) {
  return modifyMessage(emailId, { addLabelIds: ['STARRED'] });
}

export async function unstarEmail(emailId: string) {
  return modifyMessage(emailId, { removeLabelIds: ['STARRED'] });
}

export async function markAsRead(emailId: string) {
  return modifyMessage(emailId, { removeLabelIds: ['UNREAD'] });
}

export async function archiveEmail(emailId: string) {
  return modifyMessage(emailId, { removeLabelIds: ['INBOX'] });
}

export async function getLabels(): Promise<GmailLabel[]> {
  const gmail = getGmailClient();
  const response = await gmail.users.labels.list({ userId: 'me' });

  return (response.data.labels || []).map((label) => ({
    id: label.id!,
    name: label.name!,
  }));
}

export async function applyLabel(emailId: string, labelId: string) {
  return modifyMessage(emailId, { addLabelIds: [labelId] });
}

export async function createDraft(input: { to: string[]; subject: string; body: string; inReplyTo?: string }) {
  const gmail = getGmailClient();

  const headers = [
    `To: ${input.to.join(', ')}`,
    `Subject: ${input.subject}`,
    'Content-Type: text/plain; charset=utf-8',
  ];

  let threadId: string | undefined;

  if (input.inReplyTo) {
    const original = await gmail.users.messages.get({
      userId: 'me',
      id: input.inReplyTo,
      format: 'metadata',
      metadataHeaders: ['Message-ID'],
    });

    const messageId = getHeader(original.data.payload?.headers, 'Message-ID');
    threadId = original.data.threadId || undefined;

    if (messageId) {
      headers.push(`In-Reply-To: ${messageId}`);
      headers.push(`References: ${messageId}`);
    }
  }

  const rawEmail = `${headers.join('\r\n')}\r\n\r\n${input.body}`;
  const encodedEmail = Buffer.from(rawEmail).toString('base64url');

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedEmail,
        ...(threadId ? { threadId } : {}),
      },
    },
  });

  return {
    id: response.data.id!,
    to: input.to,
    subject: input.subject,
    body: input.body,
    createdAt: new Date().toISOString(),
    ...(threadId ? { threadId } : {}),
    ...(response.data.message?.id ? { messageId: response.data.message.id } : {}),
  };
}

export async function searchEmails(query: string, maxResults = 10): Promise<EmailSummary[]> {
  const gmail = getGmailClient();
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  return getMessageSummaries(response.data.messages);
}
