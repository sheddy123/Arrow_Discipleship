import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserCog, Crown, Wand2, AlertCircle, X } from 'lucide-react'
import { mentorsApi, type CohortRoster } from '@/api/mentors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const UNASSIGNED = '__unassigned__'

export default function MentorRosterPage() {
  const [sp] = useSearchParams()
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [redistribute, setRedistribute] = useState(false)

  const { data: cohorts } = useQuery({
    queryKey: ['mentor-cohorts'],
    queryFn: () => mentorsApi.getCohorts().then((r) => r.data),
  })
  const paramId = Number(sp.get('cohortId') ?? 0)
  const cohort = cohorts?.find((c) => c.id === paramId) ?? cohorts?.[0]
  const cohortId = cohort?.id ?? 0

  const rosterKey = ['mentor', 'roster', cohortId]
  const invalidate = () => qc.invalidateQueries({ queryKey: rosterKey })
  const fail = (e: any, msg: string) => setError(e?.response?.data?.error ?? msg)

  const { data: roster, isLoading } = useQuery({
    queryKey: rosterKey,
    queryFn: () => mentorsApi.getRoster(cohortId).then((r) => r.data as CohortRoster),
    enabled: cohortId > 0,
  })

  const mentors = roster?.mentors ?? []
  const students = roster?.students ?? []
  const mentorOptions = useMemo(
    () => [{ value: UNASSIGNED, label: 'Unassigned' }, ...mentors.map((m) => ({ value: m.id, label: m.name }))],
    [mentors],
  )

  const assign = useMutation({
    mutationFn: (v: { studentId: string; mentorId: string | null }) =>
      mentorsApi.assignStudentMentor(cohortId, v.studentId, v.mentorId),
    onSuccess: invalidate,
    onError: (e) => fail(e, 'Could not update assignment.'),
  })
  const autoAssign = useMutation({
    mutationFn: () => mentorsApi.autoAssignMentors(cohortId, redistribute),
    onSuccess: (r) => { setNotice(`Assigned ${r.data.changed} student${r.data.changed === 1 ? '' : 's'}.`); invalidate() },
    onError: (e) => fail(e, 'Could not auto-assign.'),
  })

  const clear = () => { setError(''); setNotice('') }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="size-6 text-[var(--du-primary)]" />
          Students {cohort ? `· ${cohort.name}` : ''}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign students to a mentor, or auto-assign them evenly across the cohort's mentors.
        </p>
      </div>

      {error && <Banner tone="error" onClose={clear}>{error}</Banner>}
      {notice && !error && <Banner tone="ok" onClose={clear}>{notice}</Banner>}

      {!cohort ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">You don't lead any cohorts yet.</Card>
      ) : isLoading ? (
        <Card className="p-6"><Skeleton className="h-40 w-full" /></Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <UserCog className="size-4 text-muted-foreground" /> Mentors
                <Badge variant="secondary">{mentors.length}</Badge>
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={redistribute} onCheckedChange={(v) => setRedistribute(v === true)} />
                  Redistribute everyone
                </label>
                <Button variant="outline" onClick={() => autoAssign.mutate()} disabled={autoAssign.isPending}>
                  <Wand2 className="size-4" /> Auto-assign
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {mentors.map((m) => (
                <span key={m.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm">
                  <span className="font-medium">{m.name}</span>
                  {m.isLead && (
                    <Badge className="gap-1 bg-[var(--gold-bg)] text-[var(--gold-text)]"><Crown className="size-3" /> Lead</Badge>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">{m.studentCount} assigned</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Only an admin can add or remove mentors on a cohort. Auto-assign spreads students evenly (balanced);
              tick “Redistribute everyone” to re-spread the whole cohort.
            </p>
          </Card>

          <Card className="overflow-hidden py-0">
            <div className="border-b border-border p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Users className="size-4 text-muted-foreground" /> Students
                <Badge variant="secondary">{students.length}</Badge>
              </h2>
            </div>
            {students.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No students enrolled yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="px-5">Student</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="w-56">Assigned mentor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="px-5 font-medium">{s.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{s.email}</TableCell>
                      <TableCell>
                        <Combobox
                          options={mentorOptions}
                          value={s.mentorId ?? UNASSIGNED}
                          onValueChange={(v) => assign.mutate({ studentId: s.id, mentorId: v === UNASSIGNED ? null : v })}
                          placeholder="Unassigned"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function Banner({ tone, onClose, children }: { tone: 'error' | 'ok'; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className={cn(
      'mb-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm',
      tone === 'error'
        ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
    )}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span className="flex-1">{children}</span>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  )
}
