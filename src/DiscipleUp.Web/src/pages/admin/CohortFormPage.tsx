import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { adminApi } from '@/api/admin'
import type { UserSummary } from '@/api/admin'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'

const tealBtn = 'bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110'

export default function CohortFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    mentorId: '',
    lateEntryWindowDays: 5,
    isPaid: false,
    weekCount: 4,
  })
  const [error, setError] = useState('')

  const { data: users = [] } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })
  const mentors = (users as UserSummary[]).filter((u) => u.role === 'Mentor' || u.role === 'Admin')

  const create = useMutation({
    mutationFn: () => adminApi.createCohort({ ...form }),
    onSuccess: (res) => navigate(`/admin/cohorts/${res.data.id}/content`),
    onError: (err: any) => setError(err.response?.data?.error ?? 'Failed to create cohort.'),
  })

  const canSubmit = form.name && form.startDate && form.mentorId

  return (
    <div className="mx-auto max-w-xl p-6 md:p-8">
      <div className="mb-6">
        <Link to="/admin/cohorts"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to cohorts
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">New cohort</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a cohort, then add weeks and daily content.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardContent className="grid gap-5">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Cohort name</Label>
            <Input id="name" value={form.name} placeholder="e.g. July 2026 Cohort"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="startDate">Start date</Label>
            <Input id="startDate" type="date" value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mentorId">Assigned mentor</Label>
            <Combobox
              id="mentorId"
              options={mentors.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName} (${m.email})` }))}
              value={form.mentorId}
              onValueChange={(mentorId) => setForm({ ...form, mentorId })}
              placeholder="Search mentor…"
              emptyText="No mentors found."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="weekCount">Number of weeks</Label>
              <Input id="weekCount" type="number" min={1} max={52} value={form.weekCount}
                onChange={(e) => setForm({ ...form, weekCount: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })} />
              <p className="text-xs text-muted-foreground">
                Starts with this many weeks — add or remove any time.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="lateEntry">Late entry window (days)</Label>
              <Input id="lateEntry" type="number" min={0} max={14} value={form.lateEntryWindowDays}
                onChange={(e) => setForm({ ...form, lateEntryWindowDays: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">
                Self-enrol window after the start date.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox id="isPaid" checked={form.isPaid}
              onCheckedChange={(v) => setForm({ ...form, isPaid: v === true })} />
            <Label htmlFor="isPaid" className="font-normal">
              Paid cohort <span className="text-muted-foreground">(Stripe integration — Phase 2)</span>
            </Label>
          </div>

          <div className="flex gap-3 pt-1">
            <Button className={tealBtn} onClick={() => create.mutate()}
              disabled={create.isPending || !canSubmit}>
              {create.isPending ? 'Creating…' : 'Create cohort'}
            </Button>
            <Link to="/admin/cohorts" className={cn(buttonVariants({ variant: 'outline' }))}>
              Cancel
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
