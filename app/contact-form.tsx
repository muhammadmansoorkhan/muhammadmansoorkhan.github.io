'use client';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, LoaderCircle, Send } from 'lucide-react';
import { inquiryEndpoint, inquiryAnonKey } from './inquiry-config';
import { inquiryServices, validateInquiry } from '../supabase/functions/portfolio-inquiry/validation';

type Props = { service: string; onServiceChange: (value: string) => void };
export default function ContactForm({ service, onServiceChange }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const pending = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  function clearFeedback() { if (!pending.current) { setStatus('idle'); setMessage(''); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const snapshot = JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), service, details: details.trim(), website });
    if (attempt.current?.payload !== snapshot) attempt.current = { payload: snapshot, id: crypto.randomUUID() };
    const payload = { ...JSON.parse(snapshot), id: attempt.current!.id };
    const validation = validateInquiry(payload);
    if ('error' in validation) { setStatus('error'); setMessage(validation.error); return; }
    pending.current = true; setStatus('sending'); setMessage('Sending your inquiry…');
    try {
      const response = await fetch(inquiryEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: inquiryAnonKey, Authorization: `Bearer ${inquiryAnonKey}` },
        body: JSON.stringify(validation.data), signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Unable to send. Please try again or use one of my social links.');
      setStatus('success'); setMessage('Thank you! Your inquiry has been received. I’ll reply to your email.');
      setName(''); setEmail(''); setDetails(''); setWebsite(''); attempt.current = null;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError'
        ? error.message : 'We couldn’t confirm your submission. Check your connection and retry; your details are still here.');
    } finally { pending.current = false; }
  }
  return <form className="brief-form" onSubmit={submit} aria-busy={status === 'sending'}>
    <h3>Send a project inquiry <ArrowUpRight size={19}/></h3>
    <fieldset disabled={status === 'sending'} className="inquiry-fields">
      <label htmlFor="name">Your name</label>
      <input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" placeholder="How should I address you?" value={name} onChange={e => { setName(e.target.value); clearFeedback(); }}/>
      <label htmlFor="email">Your email</label>
      <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); clearFeedback(); }}/>
      <label htmlFor="service">What do you need?</label>
      <select id="service" name="service" value={service} onChange={e => { onServiceChange(e.target.value); clearFeedback(); }}>{inquiryServices.map(item => <option key={item}>{item}</option>)}</select>
      <label htmlFor="details">A little about your project</label>
      <textarea id="details" name="details" required minLength={10} maxLength={5000} rows={4} placeholder="Your idea, goals, budget, and timeline…" value={details} onChange={e => { setDetails(e.target.value); clearFeedback(); }}/>
      <div className="inquiry-honeypot" aria-hidden="true"><label htmlFor="website">Leave this field empty</label><input id="website" name="website" autoComplete="off" tabIndex={-1} value={website} onChange={e => setWebsite(e.target.value)}/></div>
      <button className="button primary w-full" type="submit">{status === 'sending' ? 'Sending…' : status === 'success' ? 'Inquiry sent' : 'Send inquiry'} {status === 'sending' ? <LoaderCircle className="inquiry-spinner" size={18}/> : status === 'success' ? <Check size={18}/> : <Send size={18}/>}</button>
    </fieldset>
    <p className={`form-note inquiry-feedback ${status}`} role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{message || 'Your name, email, and project details are saved privately so I can respond to your inquiry.'}</p>
  </form>;
}
