import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { mentorsApi } from '@/api/mentors'

/**
 * Loads the mentor's cohorts and resolves the active one from ?cohortId=,
 * falling back to the first cohort. All mentor pages share this so navigation
 * between them keeps the same cohort selected.
 */
export function useMentorCohort() {
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: cohorts, isLoading } = useQuery({
    queryKey: ['mentor-cohorts'],
    queryFn: () => mentorsApi.getCohorts().then(r => r.data),
  })

  const paramId = Number(searchParams.get('cohortId') ?? 0)
  const cohort = cohorts?.find(c => c.id === paramId) ?? cohorts?.[0]

  const selectCohort = (id: number) => {
    searchParams.set('cohortId', String(id))
    setSearchParams(searchParams, { replace: true })
  }

  return { cohorts: cohorts ?? [], cohort, isLoading, selectCohort }
}
