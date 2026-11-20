import { Link } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type SimilarParams, useSimilarOutlets } from '../api'

/**
 * OT-02: while adding an outlet, list outlets with a similar name in the same
 * district. Only a warning — the admin can still save (two branches can share a name).
 */
export function SimilarOutletsNotice(params: SimilarParams) {
  // Ask the server once typing pauses
  const key = JSON.stringify(params)
  const [debounced, setDebounced] = useState(params)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(JSON.parse(key) as SimilarParams), 400)
    return () => clearTimeout(timer)
  }, [key])

  const similar = useSimilarOutlets(debounced)

  if (!similar.data?.length) return null

  return (
    <div role="status" className="flex flex-col gap-2 rounded-md bg-warning-soft px-4 py-3 text-warning-text">
      <p className="flex items-start gap-2 font-medium">
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        Ada outlet dengan nama mirip di wilayah ini. Pastikan bukan outlet yang sama.
      </p>
      <ul className="flex flex-col gap-1 pl-7">
        {similar.data.map((outlet) => (
          <li key={outlet.id}>
            <Link
              to="/office/outlets/$outletId"
              params={{ outletId: outlet.id }}
              target="_blank"
              className="underline underline-offset-4"
            >
              {outlet.name}
            </Link>{' '}
            · {outlet.district} · {outlet.code}
            {!outlet.is_active && ' · nonaktif'}
          </li>
        ))}
      </ul>
    </div>
  )
}
