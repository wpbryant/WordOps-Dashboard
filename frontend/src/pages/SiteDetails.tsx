import { useParams } from 'react-router-dom'

export function SiteDetails() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Site Details: {id}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">Site details view coming soon.</p>
    </div>
  )
}
