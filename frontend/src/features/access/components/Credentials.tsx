import { Copy, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Shown once after adding a user or resetting a password: the admin passes the
 * sign-in details on, by WhatsApp or by reading them out. They are not shown again.
 */
export function Credentials({
  name,
  username,
  phone,
  password,
  onDone,
}: {
  name: string
  username: string
  phone: string
  password: string
  onDone: () => void
}) {
  const text = `Akun SIGAP untuk ${name}\nMasuk dengan nomor HP ${phone} atau username ${username}\nKata sandi: ${password}`
  const wa = `https://wa.me/${phone.replace(/^0/, '62')}?text=${encodeURIComponent(text)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Info masuk disalin.')
    } catch {
      toast.error('Tidak bisa menyalin. Catat kata sandinya secara manual.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-muted p-4">
        <dt className="text-muted-foreground">Nomor HP</dt>
        <dd className="font-medium">{phone}</dd>
        <dt className="text-muted-foreground">Username</dt>
        <dd className="font-medium">{username}</dd>
        <dt className="text-muted-foreground">Kata sandi</dt>
        <dd className="font-mono text-lg font-semibold tracking-wide" data-testid="new-password">
          {password}
        </dd>
      </dl>
      <p className="text-muted-foreground">Kata sandi ini hanya tampil sekarang. Sampaikan ke {name}, lalu tutup.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" asChild>
          <a href={wa} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden />
            Kirim lewat WhatsApp
          </a>
        </Button>
        <Button variant="outline" onClick={copy}>
          <Copy aria-hidden />
          Salin
        </Button>
        <Button className="sm:ml-auto" onClick={onDone}>
          Selesai
        </Button>
      </div>
    </div>
  )
}
