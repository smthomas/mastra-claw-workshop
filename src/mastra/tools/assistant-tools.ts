import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  applyLabel as applyGmailLabel,
  archiveEmail as archiveGmailEmail,
  createDraft as createGmailDraft,
  fetchStarredEmails as fetchGmailStarredEmails,
  fetchUnreadEmails as fetchGmailUnreadEmails,
  getEmailContent as getGmailEmailContent,
  getLabels as getGmailLabels,
  searchEmails as searchGmailEmails,
  starEmail as starGmailEmail,
  unstarEmail as unstarGmailEmail,
  markAsRead as markGmailAsRead,
  type EmailMessage,
} from '../services/assistant-data';

const emailSummarySchema = z.object({
  id: z.string(),
  threadId: z.string(),
  from: z.string(),
  subject: z.string(),
  date: z.string(),
  snippet: z.string(),
  labels: z.array(z.string()),
  isUnread: z.boolean(),
  isStarred: z.boolean(),
});

const emailMessageSchema = emailSummarySchema.extend({
  to: z.array(z.string()),
  body: z.string(),
});

function summarizeEmail(email: EmailMessage) {
  return {
    id: email.id,
    threadId: email.threadId,
    from: email.from,
    subject: email.subject,
    date: email.date,
    snippet: email.snippet,
    labels: email.labels,
    isUnread: email.isUnread,
    isStarred: email.isStarred,
  };
}

export const fetchUnreadEmails = createTool({
  id: 'fetch-unread-emails',
  description: 'Fetch unread inbox emails from Gmail.',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(10),
  }),
  outputSchema: z.object({ emails: z.array(emailSummarySchema) }),
  execute: async ({ limit }) => ({ emails: await fetchGmailUnreadEmails(limit) }),
});

export const fetchStarredEmails = createTool({
  id: 'fetch-starred-emails',
  description: 'Fetch starred emails from Gmail.',
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(50),
  }),
  outputSchema: z.object({ emails: z.array(emailSummarySchema) }),
  execute: async ({ limit }) => ({ emails: await fetchGmailStarredEmails(limit) }),
});

export const getEmailContent = createTool({
  id: 'get-email-content',
  description: 'Get full Gmail email content by email ID.',
  inputSchema: z.object({ emailId: z.string() }),
  outputSchema: emailMessageSchema,
  execute: async ({ emailId }) => getGmailEmailContent(emailId),
});

function mutateEmailTool(
  id: string,
  description: string,
  mutate: (emailId: string) => Promise<EmailMessage>,
) {
  return createTool({
    id,
    description,
    inputSchema: z.object({ emailId: z.string() }),
    outputSchema: z.object({ email: emailSummarySchema }),
    execute: async ({ emailId }) => ({ email: summarizeEmail(await mutate(emailId)) }),
  });
}

export const starEmail = mutateEmailTool('star-email', 'Star a Gmail email.', starGmailEmail);
export const unstarEmail = mutateEmailTool('unstar-email', 'Remove a star from a Gmail email.', unstarGmailEmail);
export const archiveEmail = mutateEmailTool('archive-email', 'Archive a Gmail email.', archiveGmailEmail);
export const markAsRead = mutateEmailTool('mark-as-read', 'Mark a Gmail email as read.', markGmailAsRead);

export const applyLabel = createTool({
  id: 'apply-label',
  description: 'Apply a Gmail label to an email.',
  inputSchema: z.object({
    emailId: z.string(),
    labelId: z.string().min(1),
  }),
  outputSchema: z.object({ email: emailSummarySchema }),
  execute: async ({ emailId, labelId }) => ({ email: summarizeEmail(await applyGmailLabel(emailId, labelId)) }),
});

export const createDraft = createTool({
  id: 'create-draft',
  description: 'Create a Gmail draft.',
  inputSchema: z.object({
    to: z.array(z.string()).min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    inReplyTo: z.string().optional(),
  }),
  outputSchema: z.object({
    id: z.string(),
    to: z.array(z.string()),
    subject: z.string(),
    body: z.string(),
    createdAt: z.string(),
    threadId: z.string().optional(),
    messageId: z.string().optional(),
  }),
  execute: async ({ to, subject, body, inReplyTo }) => createGmailDraft({ to, subject, body, inReplyTo }),
});

export const searchEmails = createTool({
  id: 'search-emails',
  description: 'Search Gmail using Gmail query syntax.',
  inputSchema: z.object({
    query: z.string().min(1),
    limit: z.number().int().min(1).max(50).default(10),
  }),
  outputSchema: z.object({ emails: z.array(emailSummarySchema) }),
  execute: async ({ query, limit }) => ({ emails: await searchGmailEmails(query, limit) }),
});

export const getLabels = createTool({
  id: 'get-labels',
  description: 'Get all Gmail labels.',
  inputSchema: z.object({}).default({}),
  outputSchema: z.object({ labels: z.array(z.object({ id: z.string(), name: z.string() })) }),
  execute: async () => ({ labels: await getGmailLabels() }),
});

export const recommendUnsubscribe = createTool({
  id: 'recommend-unsubscribe',
  description: 'Recommend whether an email looks safe to unsubscribe from.',
  inputSchema: z.object({ emailId: z.string() }),
  outputSchema: z.object({ recommendation: z.string() }),
  execute: async ({ emailId }) => {
    const email = await getGmailEmailContent(emailId);
    const looksLikeNewsletter =
      email.labels.includes('CATEGORY_PROMOTIONS') || /newsletter|unsubscribe|digest/i.test(email.body + email.subject);

    return {
      recommendation: looksLikeNewsletter
        ? `This looks like a newsletter or bulk update from ${email.from}. Unsubscribing is likely appropriate.`
        : `This looks like a direct or transactional email from ${email.from}. I would not recommend unsubscribing.`,
    };
  },
});

export const fetchYoutubeDetails = createTool({
  id: 'fetch-youtube-details',
  description: 'Fetch basic YouTube video metadata from a URL.',
  inputSchema: z.object({ url: z.string().url() }),
  outputSchema: z.object({
    title: z.string(),
    authorName: z.string(),
    authorUrl: z.string(),
    thumbnailUrl: z.string(),
    providerName: z.string(),
    url: z.string(),
  }),
  execute: async ({ url }) => {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);

    if (!response.ok) {
      throw new Error(`Unable to fetch YouTube details for ${url}`);
    }

    const data = (await response.json()) as {
      title: string;
      author_name: string;
      author_url: string;
      thumbnail_url: string;
      provider_name: string;
    };

    return {
      title: data.title,
      authorName: data.author_name,
      authorUrl: data.author_url,
      thumbnailUrl: data.thumbnail_url,
      providerName: data.provider_name,
      url,
    };
  },
});

export const assistantTools = {
  fetchUnreadEmails,
  fetchStarredEmails,
  getEmailContent,
  starEmail,
  unstarEmail,
  applyLabel,
  archiveEmail,
  markAsRead,
  createDraft,
  searchEmails,
  getLabels,
  recommendUnsubscribe,
  fetchYoutubeDetails,
};
