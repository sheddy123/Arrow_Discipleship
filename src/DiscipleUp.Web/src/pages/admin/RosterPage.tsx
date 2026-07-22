import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Users, UserPlus, Crown, X, Wand2, AlertCircle, ArrowRightLeft, UserCog,
} from 'lucide-react'
import { adminApi, type CohortRoster } from '@/api/admin'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'

const UNASSIGNED = '__unassigned__'

export default function RosterPage() {
  const { id } = useParams<{ id: string }>()
  const cohortId = Number(id)
  const qc = useQueryClient()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [redistribute, setRedistribute] = useState(false)
  const [addMentorId, setAddMentorId] = useState('')
  const [enrolId, setEnrolId] = useState('')
  const [moveFor, setMoveFor] = useState<{ id: string; name: string } | null>(null)
  const [moveTarget, setMoveTarget] = useState('')

  const rosterKey = ['admin', 'roster', cohortId]
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: rosterKey })
    qc.invalidateQueries({ queryKey: ['admin', 'cohorts'] })
  }
  const fail = (err: any, fallback: string) => setError(err?.response?.data?.error ?? fallback)

  const { data: roster, isLoading } = useQuery({
    queryKey: rosterKey,
    queryFn: () => adminApi.getRoster(cohortId).then((r) => r.data as CohortRoster),
    enabled: Number.isFinite(cohortId),
  })
  const { data: cohorts = [] } = useQuery({
    queryKey: ['admin', 'cohorts'],
    queryFn: () => adminApi.listCohorts().then((r) => r.data),
  })
  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  const cohort = cohorts.find((c) => c.id === cohortId)
  const mentors = roster?.mentors ?? []
  const students = roster?.students ?? []

  // Mentors (by role) not already on this cohort
  const addableMentors = useMemo(() => {
    const on = new Set(mentors.map((m) => m.id))
    return users
      .filter((u) => u.role === 'Mentor' && u.status !== 'Suspended' && !on.has(u.id))
      .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
  }, [users, mentors])

  // Students (by role) not already enrolled here
  const enrollableStudents = useMemo(() => {
    const on = new Set(students.map((s) => s.id))
    return users
      .filter((u) => u.role === 'Student' && u.status !== 'Suspended' && !on.has(u.id))
      .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))
  }, [users, students])

  const mentorOptions = useMemo(
    () => [{ value: UNASSIGNED, label: 'Unassigned' }, ...mentors.map((m) => ({ value: m.id, label: m.name }))],
    [mentors],
  )
  const moveTargets = useMemo(
    () => cohorts.filter((c) => c.id !== cohortId).map((c) => ({ value: String(c.id), label: c.name })),
    [cohorts, cohortId],
  )

  const addMentor = useMutation({
    mutationFn: (mentorId: string) => adminApi.addCohortMentor(cohortId, mentorId),
    onSuccess: () => { setAddMentorId(''); invalidate() },
    onError: (e) => fail(e, 'Could not add mentor.'),
  })
  const removeMentor = useMutation({
    mutationFn: (mentorId: string) => adminApi.removeCohortMentor(cohortId, mentorId),
    onSuccess: invalidate,
    onError: (e) => fail(e, 'Could not remove mentor.'),
  })
  const assign = useMutation({
    mutationFn: (v: { studentId: string; mentorId: string | null }) =>
      adminApi.assignStudentMentor(cohortId, v.studentId, v.mentorId),
    onSuccess: invalidate,
    onError: (e) => fail(e, 'Could not update assignment.'),
  })
  const autoAssign = useMutation({
    mutationFn: () => adminApi.autoAssignMentors(cohortId, redistribute),
    onSuccess: (r) => { setNotice(`Assigned ${r.data.changed} student${r.data.changed === 1 ? '' : 's'}.`); invalidate() },
    onError: (e) => fail(e, 'Could not auto-assign.'),
  })
  const enrol = useMutation({
    mutationFn: (studentId: string) => adminApi.enrolStudent(cohortId, studentId),
    onSuccess: () => { setEnrolId(''); invalidate() },
    onError: (e) => fail(e, 'Could not enrol student.'),
  })
  const move = useMutation({
    mutationFn: (v: { studentId: string; target: number }) => adminApi.moveStudent(v.studentId, v.target),
    onSuccess: () => { setMoveFor(null); setMoveTarget(''); invalidate() },
    onError: (e) => fail(e, 'Could not move student.'),
  })

  const clearBanners = () => { setError(''); setNotice('') }

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <Link to="/admin/cohorts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to cohorts
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Users className="size-6 text-[var(--du-primary)]" />
          {cohort?.name ?? 'Cohort'} · People
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage this cohort's mentors and which mentor each student is assigned to.
        </p>
      </div>

      {error && (
        <Banner tone="error" onClose={clearBanners}>{error}</Banner>
      )}
      {notice && !error && (
        <Banner tone="ok" onClose={clearBanners}>{notice}</Banner>
      )}

      {isLoading ? (
        <Card className="p-6"><Skeleton className="h-40 w-full" /></Card>
      ) : (
        <div className="space-y-6">
          {/* Mentors */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <UserCog className="size-4 text-muted-foreground" /> Mentors
                <Badge variant="secondary">{mentors.length}</Badge>
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {mentors.map((m) => (
                <span key={m.id}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pl-3 pr-1.5 text-sm">
                  <span className="font-medium">{m.name}</span>
                  {m.isLead && (
                    <Badge className="gap-1 bg-[var(--gold-bg)] text-[var(--gold-text)]">
                      <Crown className="size-3" /> Lead
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums">{m.studentCount} assigned</span>
                  {!m.isLead && (
                    <button
                      aria-label={`Remove ${m.name}`}
                      onClick={() => removeMentor.mutate(m.id)}
                      disabled={removeMentor.isPending}
                      className="flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <div className="min-w-56 flex-1">
                <Combobox
                  options={addableMentors}
                  value={addMentorId}
                  onValueChange={setAddMentorId}
                  placeholder={addableMentors.length ? 'Add a mentor…' : 'No more mentors available'}
                  disabled={!addableMentors.length}
                />
              </div>
              <Button
                onClick={() => addMentorId && addMentor.mutate(addMentorId)}
                disabled={!addMentorId || addMentor.isPending}
                className="bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110"
              >
                <UserPlus className="size-4" /> Add mentor
              </Button>

              <div className="ml-auto flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox checked={redistribute} onCheckedChange={(v) => setRedistribute(v === true)} />
                  Redistribute everyone
                </label>
                <Button
                  variant="outline"
                  onClick={() => autoAssign.mutate()}
                  disabled={autoAssign.isPending || mentors.length === 0}
                  title={mentors.length === 0 ? 'Add a mentor first' : undefined}
                >
                  <Wand2 className="size-4" /> Auto-assign
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Auto-assign spreads students evenly across mentors (balanced). By default only unassigned students are
              placed; tick “Redistribute everyone” to re-spread the whole cohort.
            </p>
          </Card>

          {/* Students */}
          <Card className="overflow-hidden py-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Users className="size-4 text-muted-foreground" /> Students
                <Badge variant="secondary">{students.length}</Badge>
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-56">
                  <Combobox
                    options={enrollableStudents}
                    value={enrolId}
                    onValueChange={setEnrolId}
                    placeholder={enrollableStudents.length ? 'Enrol a student…' : 'No students available'}
                    disabled={!enrollableStudents.length}
                  />
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => enrolId && enrol.mutate(enrolId)}
                  disabled={!enrolId || enrol.isPending}
                >
                  <UserPlus className="size-4" /> Enrol
                </Button>
              </div>
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
                    <TableHead className="w-12 px-5" />
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
                          onValueChange={(v) =>
                            assign.mutate({ studentId: s.id, mentorId: v === UNASSIGNED ? null : v })}
                          placeholder="Unassigned"
                        />
                      </TableCell>
                      <TableCell className="px-5 text-right">
                        <Button
                          variant="ghost" size="icon-sm"
                          aria-label={`Move ${s.name} to another cohort`}
                          title="Move to another cohort"
                          onClick={() => { setMoveFor({ id: s.id, name: s.name }); setMoveTarget('') }}
                        >
                          <ArrowRightLeft className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Move student dialog */}
      <Dialog open={moveFor !== null} onOpenChange={(o) => { if (!o) setMoveFor(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move {moveFor?.name}</DialogTitle>
            <DialogDescription>
              They keep access to this cohort until moved. Moving starts them fresh in the new cohort and clears their
              current progress here.
            </DialogDescription>
          </DialogHeader>
          <div className="py-1">
            <Combobox
              options={moveTargets}
              value={moveTarget}
              onValueChange={setMoveTarget}
              placeholder={moveTargets.length ? 'Select a cohort…' : 'No other cohorts'}
              disabled={!moveTargets.length}
            />
          </div>
          <DialogFooter>
            <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
            <Button
              onClick={() => moveFor && moveTarget && move.mutate({ studentId: moveFor.id, target: Number(moveTarget) })}
              disabled={!moveTarget || move.isPending}
              className="bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110"
            >
              Move student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
