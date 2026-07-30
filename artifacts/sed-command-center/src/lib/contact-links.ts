/** Build safe, reusable links for customer contact actions. */
export function getEmailLink(email: string | null | undefined): string | null {
  const normalized = email?.trim().replace(/[\r\n]/g, "");
  return normalized ? `mailto:${encodeURIComponent(normalized)}` : null;
}

/**
 * WhatsApp expects an international number containing digits only. Indonesian
 * local numbers are commonly stored as 08… (or just 8…), so normalize those
 * to country code 62 while leaving other international numbers intact.
 */
export function getWhatsAppLink(phone: string | null | undefined): string | null {
  const raw = phone?.trim();
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;

  return digits ? `https://wa.me/${digits}` : null;
}
