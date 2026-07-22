import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, MoreHorizontal, FileText, Rocket, Trash2, X, AlertCircle, Users } from 'lucide-react'
import { adminApi, type CohortSummary } from '@/api/admin'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const statusBadge: Record<CohortSummary['status'], string> = {
  Draft: 'bg-muted text-muted-foreground',
  Published: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Archived: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

function formatDate(s: string) {
  const d = new Date(`${s}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? s
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CohortsPage() {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [error, setError] = useState('')
  const { data: cohorts = [], isLoading } = useQuery({
    queryKey: ['admin', 'cohorts'],
    queryFn: () => adminApi.listCohorts().then((r) => r.data),
  })

  const publish = useMutation({
    mutationFn: (id: number) => adminApi.publishCohort(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cohorts'] }),
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteCohort(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'cohorts'] }),
    onError: (err: any) => setError(err.response?.data?.error ?? 'Could not delete cohort.'),
  })

  function confirmDelete(c: CohortSummary) {
    const warn = c.enrolledStudents > 0
      ? `\n\nThis permanently removes ${c.enrolledStudents} enrolled student${c.enrolledStudents === 1 ? '' : 's'}’ progress and submissions.`
      : ''
    if (window.confirm(`Delete "${c.name}" and all of its content?${warn}\n\nThis cannot be undone.`))
      remove.mutate(c.id)
  }

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cohorts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage discipleship cohorts, content, and enrolment.
          </p>
        </div>
        <Link
          to="/admin/cohorts/new"
          className={cn(
            buttonVariants({ size: 'lg' }),
            'bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110',
          )}
        >
          <Plus className="size-4" />
          New cohort
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError('')} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      )}

      {isLoading ? (
        <Card className="p-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
          ))}
        </Card>
      ) : cohorts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-[var(--primary-light)] text-[var(--du-primary)]">
            <FileText className="size-6" />
          </div>
          <div>
            <p className="font-medium">No cohorts yet</p>
            <p className="text-sm text-muted-foreground">Create your first cohort to get started.</p>
          </div>
          <Link
            to="/admin/cohorts/new"
            className={cn(
              buttonVariants(),
              'bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110',
            )}
          >
            <Plus className="size-4" />
            New cohort
          </Link>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {cohorts.map((c: CohortSummary) => (
            <Card key={c.id} className="gap-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {formatDate(c.startDate)} · {c.mentorName || '—'}
                  </div>
                </div>
                <Badge className={statusBadge[c.status]}>{c.status}</Badge>
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span><b className="font-semibold text-foreground tabular-nums">{c.enrolledStudents}</b> students</span>
                <span><b className="font-semibold text-foreground tabular-nums">{c.weekCount}</b> {c.weekCount === 1 ? 'week' : 'weeks'}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to={`/admin/cohorts/${c.id}/content`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1')}>
                  <FileText className="size-4" /> Content
                </Link>
                <Link to={`/admin/cohorts/${c.id}/roster`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1')}>
                  <Users className="size-4" /> People
                </Link>
                {c.status === 'Draft' && c.weekCount > 0 && (
                  <Button size="sm" disabled={publish.isPending}
                    className="bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110"
                    onClick={() => publish.mutate(c.id)}>
                    <Rocket className="size-4" /> Publish
                  </Button>
                )}
                <Button size="sm" variant="outline" disabled={remove.isPending}
                  aria-label={`Delete ${c.name}`}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => confirmDelete(c)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="px-4">Name</TableHead>
                <TableHead>Start date</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Weeks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 px-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohorts.map((c: CohortSummary) => (
                <TableRow key={c.id}>
                  <TableCell className="px-4 font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.startDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.mentorName || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.enrolledStudents}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {c.weekCount}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadge[c.status]}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        aria-label={`Actions for ${c.name}`}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem render={<Link to={`/admin/cohorts/${c.id}/content`} />}>
                          <FileText className="size-4" />
                          Edit content
                        </DropdownMenuItem>
                        <DropdownMenuItem render={<Link to={`/admin/cohorts/${c.id}/roster`} />}>
                          <Users className="size-4" />
                          People & mentors
                        </DropdownMenuItem>
                        {c.status === 'Draft' && c.weekCount > 0 && (
                          <DropdownMenuItem
                            onClick={() => publish.mutate(c.id)}
                            disabled={publish.isPending}
                          >
                            <Rocket className="size-4" />
                            Publish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => confirmDelete(c)}
                          disabled={remove.isPending}
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
