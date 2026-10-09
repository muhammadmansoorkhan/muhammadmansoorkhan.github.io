export const inquiryServices = ['Business website', 'Landing page', 'Figma to front-end', 'Website fixes & updates', 'Portfolio website'] as const;
export type Inquiry = { id: string; name: string; email: string; service: string; details: string; website: string };
export function validateInquiry(value: unknown): { data: Inquiry } | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Please complete the form.' };
  const input = value as Record<string, unknown>;
  for (const field of ['id', 'name', 'email', 'service', 'details', 'website']) {
    if (typeof input[field] !== 'string') return { error: 'Please complete all required fields.' };
  }
  const data: Inquiry = {
    id: (input.id as string).trim(), name: (input.name as string).trim(),
    email: (input.email as string).trim().toLowerCase(), service: input.service as string,
    details: (input.details as string).trim(), website: (input.website as string).trim(),
  };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) return { error: 'Please refresh the page and try again.' };
  if (data.name.length < 2 || data.name.length > 100) return { error: 'Please enter a name between 2 and 100 characters.' };
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: 'Please enter a valid email address.' };
  if (!(inquiryServices as readonly string[]).includes(data.service)) return { error: 'Please select a service.' };
  if (data.details.length < 10 || data.details.length > 5000) return { error: 'Please describe your project in 10–5,000 characters.' };
  return { data };
}
