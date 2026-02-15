import { redirect } from 'next/navigation'

type SearchParamValue = string | string[] | undefined

export default async function LegacyMyDevotionalPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(resolvedSearchParams || {})) {
    if (typeof value === 'string') {
      query.set(key, value)
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item)
      }
    }
  }

  const queryString = query.toString()
  redirect(`/daily-bread${queryString ? `?${queryString}` : ''}`)
}
