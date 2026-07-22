import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Award, Pencil, Trash2, CheckCircle2, AlertCircle, Lock } from 'lucide-react'
import { adminApi, type Badge as BadgeModel, type BadgeCriterion, type BadgeInput } from '@/api/admin'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const tealBtn = 'bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110'

const CRITERIA: { value: BadgeCriterion; label: string }[] = [
  { value: 'CurrentStreak', label: 'Current streak (days)' },
  { value: 'TasksCompleted', label: 'Tasks completed' },
  { value: 'AssignmentsSubmitted', label: 'Assignments submitted' },
]

// A human sentence describing when a custom badge unlocks.
function ruleText(b: Pick<BadgeModel, 'criterion' | 'threshold' | 'isCustom'>): string {
  if (!b.isCustom) return 'Built-in rule'
  const n = b.threshold
  switch (b.criterion) {
    case 'CurrentStreak': return `Reach a ${n}-day streak`
    case 'TasksCompleted': return `Complete ${n} task${n === 1 ? '' : 's'}`
    case 'AssignmentsSubmitted': return `Submit ${n} assignment${n === 1 ? '' : 's'}`
    default: return '—'
  }
}

type FormState = { name: string; description: string; iconUrl: string; criterion: BadgeCriterion; threshold: number }
const EMPTY_FORM: FormState = { name: '', description: '', iconUrl: '', criterion: 'CurrentStreak', threshold: 7 }

export default function BadgesPage() {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [editing, setEditing] = useState<BadgeModel | null>(null) // the badge being edited
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BadgeModel | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ['admin', 'badges'],
    queryFn: () => adminApi.listBadges().then((r) => r.data),
  })

  const dialogOpen = creating || !!editing

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setEditing(null)
    setCreating(true)
  }

  function openEdit(b: BadgeModel) {
    setForm({
      name: b.name, description: b.description, iconUrl: b.iconUrl ?? '',
      criterion: b.criterion === 'None' ? 'CurrentStreak' : b.criterion,
      threshold: b.threshold || 1,
    })
    setFormError('')
    setCreating(false)
    setEditing(b)
  }

  function closeDialog() {
    setCreating(false)
    setEditing(null)
  }

  const save = useMutation({
    mutationFn: () => {
      const payload: BadgeInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        iconUrl: form.iconUrl.trim() || null,
        criterion: form.criterion,
        threshold: form.threshold,
      }
      return editing
        ? adminApi.updateBadge(editing.id, payload)
        : adminApi.createBadge(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] })
      setFeedback(editing ? 'Badge updated.' : 'Badge created.')
      closeDialog()
    },
    onError: (err: any) => setFormError(err.response?.data?.error ?? 'Could not save the badge.'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminApi.deleteBadge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'badges'] })
      setFeedback('Badge deleted.')
      setDeleteTarget(null)
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Could not delete the badge.'),
  })

  function submit() {
    if (!form.name.trim()) return setFormError('Name is required.')
    if (!form.description.trim()) return setFormError('Description is required.')
    const editingBuiltIn = editing && !editing.isCustom
    if (!editingBuiltIn && form.threshold < 1) return setFormError('Threshold must be at least 1.')
    setFormError('')
    save.mutate()
  }

  const editingBuiltIn = !!editing && !editing.isCustom
  const custom = (badges as BadgeModel[]).filter((b) => b.isCustom)

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Badges</h1>
            {!isLoading && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground tabular-nums">
                {(badges as BadgeModel[]).length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Built-in badges award automatically. Add custom badges that unlock when a
            student reaches a milestone you choose.
          </p>
        </div>
        <Button size="lg" className={tealBtn} onClick={openCreate}>
          <Plus className="size-4" />
          New badge
        </Button>
      </div>

      {feedback && <Alert tone="success" onClose={() => setFeedback('')}>{feedback}</Alert>}
      {error && <Alert tone="error" onClose={() => setError('')}>{error}</Alert>}

      {isLoading ? (
        <Card className="p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="ml-auto h-5 w-14 rounded-full" />
            </div>
          ))}
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {(badges as BadgeModel[]).map((b) => (
            <Card key={b.id} className="gap-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-semibold">
                    <Award className="size-4 text-[var(--du-primary)]" /> {b.name}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{b.description}</div>
                  <div className="mt-1.5 text-xs font-medium text-foreground">{ruleText(b)}</div>
                </div>
                <Badge className={b.isCustom
                  ? 'bg-[var(--primary-light)] text-[var(--du-primary)]'
                  : 'bg-muted text-muted-foreground'}>
                  {b.isCustom ? 'Custom' : 'Built-in'}
                </Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{b.earnedCount} earned</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => openEdit(b)}>
                    <Pencil className="size-4" /> Edit
                  </Button>
                  {b.isCustom && (
                    <Button variant="ghost" size="icon-sm" aria-label="Delete"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(b)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="px-4">Badge</TableHead>
                <TableHead>Awarded for</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Earned</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(badges as BadgeModel[]).map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--du-primary)]">
                        <Award className="size-4" />
                      </span>
                      <div>
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground">{b.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ruleText(b)}</TableCell>
                  <TableCell>
                    <Badge className={b.isCustom
                      ? 'bg-[var(--primary-light)] text-[var(--du-primary)]'
                      : 'bg-muted text-muted-foreground'}>
                      {b.isCustom ? 'Custom' : 'Built-in'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{b.earnedCount}</TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => openEdit(b)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                      {b.isCustom ? (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(b)}>
                          <Trash2 className="size-4" /> Delete
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 text-xs text-muted-foreground/70">
                          <Lock className="size-3" /> Locked
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {!isLoading && custom.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No custom badges yet — create one to reward a milestone of your choosing.
        </p>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="flex-row items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--du-primary)]">
              <Award className="size-5" />
            </span>
            <div className="grid gap-0.5">
              <DialogTitle>{editing ? 'Edit badge' : 'New badge'}</DialogTitle>
              <DialogDescription>
                {editingBuiltIn
                  ? 'This is a built-in badge — you can rename it, but its award rule is fixed.'
                  : 'Custom badges unlock automatically when a student reaches the milestone.'}
              </DialogDescription>
            </div>
          </DialogHeader>

          <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); submit() }}>
            <div className="grid gap-1.5">
              <Label htmlFor="badge-name">Name</Label>
              <Input id="badge-name" value={form.name} autoFocus
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="badge-desc">Description</Label>
              <Input id="badge-desc" value={form.description}
                placeholder="Shown to students on their profile"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="badge-icon">Icon URL <span className="text-muted-foreground">(optional)</span></Label>
              <Input id="badge-icon" value={form.iconUrl}
                placeholder="https://…"
                onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))} />
            </div>

            {!editingBuiltIn && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="badge-criterion">Awarded for</Label>
                  <Combobox
                    id="badge-criterion"
                    options={CRITERIA}
                    value={form.criterion}
                    onValueChange={(v) => v && setForm((f) => ({ ...f, criterion: v as BadgeCriterion }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="badge-threshold">Reaches</Label>
                  <Input id="badge-threshold" type="number" min={1} value={form.threshold}
                    onChange={(e) => setForm((f) => ({ ...f, threshold: Math.max(1, Number(e.target.value) || 0) }))} />
                </div>
              </div>
            )}

            {!editingBuiltIn && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                Unlocks when a student’s <span className="font-medium text-foreground">{CRITERIA.find(c => c.value === form.criterion)?.label.toLowerCase()}</span> reaches <span className="font-medium text-foreground tabular-nums">{form.threshold}</span>.
              </p>
            )}

            {formError && <FieldError>{formError}</FieldError>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className={tealBtn} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create badge'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete badge</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This also removes it
              from {deleteTarget?.earnedCount ?? 0} student{deleteTarget?.earnedCount === 1 ? '' : 's'} who earned it. This can’t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>
              {remove.isPending ? 'Deleting…' : 'Delete badge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-destructive">{children}</p>
}

function Alert({ tone, onClose, children }: {
  tone: 'success' | 'error'; onClose: () => void; children: React.ReactNode
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle
  return (
    <div className={cn(
      'mb-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm',
      tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
        : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
    )}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="flex-1">{children}</span>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="size-4" />
      </button>
    </div>
  )
}
