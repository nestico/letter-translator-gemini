/**
 * Detects contact details (emails, phone numbers, web links, social media)
 * in letter text so staff can review them before saving or exporting.
 *
 * This only FLAGS content — it never changes the text. Detection is
 * deliberately conservative on phone numbers to avoid flagging dates,
 * Child IDs, and amounts.
 */

export type SensitiveDataType = 'email' | 'phone' | 'link' | 'social';

export interface SensitiveDataFinding {
    type: SensitiveDataType;
    value: string;
    source: 'transcription' | 'translation';
}

export const SENSITIVE_TYPE_LABELS: Record<SensitiveDataType, string> = {
    email: 'Email',
    phone: 'Phone number',
    link: 'Web link',
    social: 'Social media',
};

// Children Believe's own addresses can legitimately appear on letter templates
const ALLOWED_DOMAINS = ['childrenbelieve.ca', 'childrenbelieve.org'];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;
const BARE_DOMAIN_RE = /\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|org|net|ca|info|io|me|co|edu|gov|ly|app)\b(?:\/[^\s<>"')]*)?/gi;
// "@handle" preceded by start of line, whitespace or "(" — emails have text before the @ so they don't match
const HANDLE_RE = /(?:^|[\s(])(@[A-Za-z0-9_.]{3,30})\b/g;
const SOCIAL_RE = /\b(facebook|instagram|whatsapp|tiktok|snapchat|telegram|twitter|youtube|messenger|skype|wechat|viber|linkedin)\b/gi;
// A run of digits with common phone separators, kept on one line
const PHONE_CANDIDATE_RE = /\+?\(?\d[\d \t().\-\/]{5,}\d/g;
const DATE_LIKE_RE = /^\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}$/;
const PHONE_KEYWORD_RE = /(phone|tel|cell|mobile|whatsapp|call|number|contact|tel[eé]fono|celular|n[uú]mero|t[eé]l[eé]phone|portable|telefone)/i;

const isAllowedDomain = (value: string) =>
    ALLOWED_DOMAINS.some(d => value.toLowerCase().includes(d));

const findPhones = (text: string, ignoreDigits: string[]): string[] => {
    const results: string[] = [];
    for (const match of text.matchAll(PHONE_CANDIDATE_RE)) {
        const raw = match[0].trim();
        const digits = raw.replace(/\D/g, '');

        if (digits.length < 7 || digits.length > 15) continue;
        if (DATE_LIKE_RE.test(raw)) continue;
        if (ignoreDigits.includes(digits)) continue;

        const hasPlusPrefix = raw.startsWith('+');
        const before = text.slice(Math.max(0, (match.index ?? 0) - 30), match.index ?? 0);
        const nearKeyword = PHONE_KEYWORD_RE.test(before);

        // 9+ digits is almost always a phone number. Shorter local numbers
        // (8 digits in Nicaragua, Honduras, Burkina Faso) are only flagged
        // with a "+" prefix or a nearby keyword, to avoid flagging IDs.
        if (digits.length >= 9 || (hasPlusPrefix && digits.length >= 8) || nearKeyword) {
            results.push(raw);
        }
    }
    return results;
};

const scanText = (
    text: string,
    source: SensitiveDataFinding['source'],
    ignoreDigits: string[]
): SensitiveDataFinding[] => {
    if (!text) return [];
    const findings: SensitiveDataFinding[] = [];
    const add = (type: SensitiveDataType, value: string) => findings.push({ type, value: value.trim(), source });

    const emails = text.match(EMAIL_RE) || [];
    emails.filter(e => !isAllowedDomain(e)).forEach(e => add('email', e));

    // Remove emails before looking for links/handles so they aren't double-counted
    const withoutEmails = text.replace(EMAIL_RE, ' ');

    const urls = withoutEmails.match(URL_RE) || [];
    urls.filter(u => !isAllowedDomain(u)).forEach(u => add('link', u));

    const withoutUrls = withoutEmails.replace(URL_RE, ' ');
    const domains = withoutUrls.match(BARE_DOMAIN_RE) || [];
    domains.filter(d => !isAllowedDomain(d)).forEach(d => add('link', d));

    for (const m of withoutEmails.matchAll(HANDLE_RE)) add('social', m[1]);
    for (const m of text.matchAll(SOCIAL_RE)) add('social', m[1]);

    findPhones(withoutUrls, ignoreDigits).forEach(p => add('phone', p));

    return findings;
};

/**
 * Scans the transcription and translation for contact details.
 * @param ignoreValues values that are known to be safe (e.g. the Child ID) and should never be flagged as phones
 */
export const detectSensitiveData = (
    transcription: string,
    translation: string,
    ignoreValues: string[] = []
): SensitiveDataFinding[] => {
    const ignoreDigits = ignoreValues
        .map(v => (v || '').replace(/\D/g, ''))
        .filter(d => d.length > 0);

    const all = [
        ...scanText(transcription, 'transcription', ignoreDigits),
        ...scanText(translation, 'translation', ignoreDigits),
    ];

    // De-duplicate: the same number usually appears in both transcription and translation
    const seen = new Set<string>();
    return all.filter(f => {
        const key = `${f.type}:${f.type === 'phone' ? f.value.replace(/\D/g, '') : f.value.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};
