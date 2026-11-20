import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { CircleAlert, LoaderCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { outletKeys, restoreOutlet, useDeleteOutlet } from '../api'
import type { Outlet } from '../types'

/**
 * Move an outlet to the trash. The dialog states the impact in plain words
 * (UI guide §7.6), and the toast offers "Urungkan" right away (UX-07).
 */
export function DeleteOutletButton({ outlet }: { outlet: Outlet }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const remove = useDeleteOutlet()
  const salesNames = outlet.sales?.map((s) => s.name).join(', ')

  const undo = async () => {
    try {
      await restoreOutlet(outlet.id)
      await queryClient.invalidateQueries({ queryKey: outletKeys.all })
      toast.success(`Outlet ${outlet.name} dipulihkan`)
      navigate({ to: '/office/outlets/$outletId', params: { outletId: outlet.id } })
    } catch {
      toast.error('Outlet belum bisa dipulihkan. Coba lagi dari daftar outlet, filter Status: Terhapus.')
    }
  }

  const confirm = () =>
    remove.mutate(outlet.id, {
      onSuccess: () => {
        setOpen(false)
        toast.success(`Outlet ${outlet.name} dihapus`, {
          action: { label: 'Urungkan', onClick: undo },
          duration: 8000,
        })
        navigate({ to: '/office/outlets' })
      },
    })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) remove.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="danger-outline">
          <Trash2 aria-hidden />
          Hapus outlet
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>Hapus {outlet.name}?</AlertDialogTitle>
        <AlertDialogDescription>
          Outlet hilang dari daftar outlet{salesNames ? ` dan dari HP ${salesNames}` : ''}. Data dan penugasannya tetap
          tersimpan, dan outlet bisa dipulihkan dari daftar outlet dengan filter Status: Terhapus.
        </AlertDialogDescription>
        <p className="text-sm text-muted-foreground">
          Outlet yang sudah tutup sebaiknya dinonaktifkan saja lewat Ubah data, bukan dihapus.
        </p>

        {remove.error && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            {remove.error.message}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Batal</Button>
          </AlertDialogCancel>
          {/* Not AlertDialogAction: it would close the dialog before the server answers */}
          <Button variant="destructive" disabled={remove.isPending} onClick={confirm}>
            {remove.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
            Hapus outlet
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
