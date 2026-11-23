/** wa.me link for a number saved as "0812…" (the API stores the local 0 prefix). */
export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const international = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${international}`
}

/** wa.me link that opens the chat with `text` already typed; the user still taps Send. */
export function whatsappMessageLink(phone: string, text: string): string {
  return `${whatsappLink(phone)}?text=${encodeURIComponent(text)}`
}
