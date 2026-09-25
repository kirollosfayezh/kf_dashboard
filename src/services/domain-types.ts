/** Mirrors kf_backend/src/shared/types.ts — keep in sync with that file. */

export type LeadSource = "contact" | "campaign";
export type LeadStatus = "new" | "contacted" | "won" | "lost";

export interface Lead extends Record<string, unknown> {
  id: string;
  source: LeadSource;
  status: LeadStatus;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  projectType?: string;
  budget?: string;
  message: string;
  /** The CRM contact this lead was filed under. */
  contactId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalizedText {
  en: string;
  ar: string;
  /** Optional so existing documents, which predate these two, still type. */
  de?: string;
  fr?: string;
}

/** Shared shape for every "content" collection (projects, services, solutions, testimonials, faqs, blogPosts, aboutSections). */
export interface ContentItem extends Record<string, unknown> {
  id: string;
  slug: string;
  published: boolean;
  order: number;
  title: LocalizedText;
  summary?: LocalizedText;
  body?: LocalizedText;
  media?: string[];
  meta?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ContentCollection =
  | "projects"
  | "services"
  | "solutions"
  | "testimonials"
  | "faqs"
  | "blogPosts"
  | "aboutSections"
  | "legalPages"
  | "promos";

export const CONTENT_COLLECTIONS: { key: ContentCollection; label: string }[] = [
  { key: "projects", label: "Projects" },
  { key: "services", label: "Services" },
  { key: "solutions", label: "Solutions" },
  { key: "testimonials", label: "Testimonials" },
  { key: "faqs", label: "FAQ" },
  { key: "blogPosts", label: "Articles" },
  { key: "aboutSections", label: "About sections" },
];

/** Marketing tags edited on the Marketing screen and read by the public site. */
export interface TrackingSettings {
  gtmId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
  googleAdsLabel?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  snapchatPixelId?: string;
  linkedinPartnerId?: string;
  linkedinConversionId?: string;
  clarityId?: string;
  events?: Record<string, boolean>;
  respectDnt?: boolean;
  consentMode?: boolean;
  debug?: boolean;
}

/** Public profile URLs shown in the site footer and its structured data. `x` is
 *  stored as an `@handle`; the server normalises whatever is typed. */
export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  x?: string;
  github?: string;
  youtube?: string;
  tiktok?: string;
}

export interface SiteSettings extends Record<string, unknown> {
  siteName: string;
  tagline: LocalizedText;
  logoUrl?: string;
  brandColors: string[];
  languages: { code: string; label: string; enabled: boolean }[];
  defaultLanguage: string;
  seo: { defaultTitle: string; defaultDescription: string };
  pixels: TrackingSettings;
  contact: { email?: string; phone?: string; whatsapp?: string };
  social?: SocialLinks;
  updatedAt: string;
}

/** The site actions the marketing pixels report as conversions; also the
 *  `label` of a `"conversion"` journey event. */
export type ConversionKind = "lead" | "booking" | "chat_start" | "quote_accepted" | "newsletter";

export type SubscriberSource = "footer" | "article" | "popup";

/** A newsletter signup from the public site. Stored only — nothing is sent yet. */
export interface Subscriber extends Record<string, unknown> {
  id: string;
  email: string;
  lang?: string;
  source: SubscriberSource;
  visitorId?: string;
  /** The CRM contact this signup was filed under, when the email matched one. */
  contactId?: string;
  consentAt: string;
  unsubscribedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem extends Record<string, unknown> {
  id: string;
  url: string;
  path: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export type ChatSender = "visitor" | "agent";

export interface ChatMessage extends Record<string, unknown> {
  id: string;
  /** Equals the thread's `visitorId`. */
  threadId: string;
  from: ChatSender;
  text: string;
  ts: number;
}

export interface ChatThread extends Record<string, unknown> {
  id: string;
  /** The id chat routes address a thread by — NOT the Mongo `id` above. */
  visitorId: string;
  visitorMeta?: { name?: string; contact?: string };
  /** E.164, validated by the backend — every visitor gives one before chatting. */
  phone?: string;
  /** ISO country of `phone`, e.g. "EG". */
  phoneCountry?: string;
  userTyping: boolean;
  lastMessageAt: string;
  createdAt: string;
}
