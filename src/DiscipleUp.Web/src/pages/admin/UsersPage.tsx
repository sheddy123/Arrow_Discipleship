import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, KeyRound, CheckCircle2, AlertCircle, UserPlus, UserCheck, UserX } from 'lucide-react'
import { adminApi, type UserSummary } from '@/api/admin'
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

const ROLES = ['Student', 'Mentor', 'Parent', 'Admin']
const TIMEZONES = Intl.supportedValuesOf('timeZone')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type InviteErrors = { firstName?: string; lastName?: string; email?: string }

const roleBadge: Record<string, string> = {
  Student: 'bg-[var(--primary-light)] text-[var(--du-primary)]',
  Mentor:  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  Parent:  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Admin:   'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900',
}
const statusBadge = (status: string) =>
  status === 'Active'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : status === 'Suspended'
      ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'

const tealBtn = 'bg-[var(--du-primary)] text-white hover:bg-[var(--du-primary)] hover:brightness-110'

export default function UsersPage() {
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [showInvite, setShowInvite] = useState(false)
  const [resetTarget, setResetTarget] = useState<UserSummary | null>(null)
  const [inviteForm, setInviteForm] = useState({
    firstName: '', lastName: '', email: '', role: 'Student',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({})
  const [newPassword, setNewPassword] = useState('')
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  // Update a field and clear its validation error as the user types
  function updateInvite(patch: Partial<typeof inviteForm>) {
    setInviteForm((f) => ({ ...f, ...patch }))
    setInviteErrors((er) => {
      const next = { ...er }
      for (const k of Object.keys(patch)) delete next[k as keyof InviteErrors]
      return next
    })
  }

  function validateInvite(): InviteErrors {
    const e: InviteErrors = {}
    if (!inviteForm.firstName.trim()) e.firstName = 'First name is required.'
    if (!inviteForm.lastName.trim()) e.lastName = 'Last name is required.'
    if (!inviteForm.email.trim()) e.email = 'Email is required.'
    else if (!EMAIL_RE.test(inviteForm.email.trim())) e.email = 'Enter a valid email address.'
    return e
  }

  function submitInvite() {
    const errs = validateInvite()
    setInviteErrors(errs)
    if (Object.keys(errs).length === 0) invite.mutate()
  }

  function openInviteDialog() {
    setInviteErrors({})
    setShowInvite(true)
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
  })

  const invite = useMutation({
    mutationFn: () => adminApi.inviteUser(inviteForm),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setFeedback(`User invited. Temporary password: ${res.data.devTempPassword}`)
      setShowInvite(false)
      setInviteForm({ firstName: '', lastName: '', email: '', role: 'Student', timezone: inviteForm.timezone })
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Invite failed.'),
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => adminApi.changeRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  const toggleStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminApi.setUserStatus(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
    onError: (err: any) => setError(err.response?.data?.error ?? 'Could not update status.'),
  })

  const resetPassword = useMutation({
    mutationFn: () => adminApi.adminResetPassword(resetTarget!.id, newPassword),
    onSuccess: () => {
      setFeedback(`Password reset for ${resetTarget!.email}.`)
      setResetTarget(null)
      setNewPassword('')
    },
    onError: (err: any) => setError(err.response?.data?.error ?? 'Reset failed.'),
  })

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Users</h1>
            {!isLoading && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-muted-foreground tabular-nums">
                {(users as UserSummary[]).length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage roles and passwords for students, mentors, parents, and admins.
          </p>
        </div>
        <Button size="lg" className={tealBtn} onClick={openInviteDialog}>
          <Plus className="size-4" />
          Invite user
        </Button>
      </div>

      {feedback && (
        <Alert tone="success" onClose={() => setFeedback('')}>{feedback}</Alert>
      )}
      {error && (
        <Alert tone="error" onClose={() => setError('')}>{error}</Alert>
      )}

      {isLoading ? (
        <Card className="p-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
          ))}
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {(users as UserSummary[]).map((u) => (
            <Card key={u.id} className="gap-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{u.firstName} {u.lastName}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge className={roleBadge[u.role] ?? 'bg-muted text-muted-foreground'}>{u.role}</Badge>
                  <Badge className={statusBadge(u.status)}>{u.status}</Badge>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Combobox
                  options={ROLES}
                  value={u.role}
                  onValueChange={(role) => role && changeRole.mutate({ id: u.id, role })}
                  className="w-36"
                  emptyText="No role."
                />
                <div className="flex items-center gap-1">
                  {u.status === 'Active' ? (
                    <Button variant="ghost" size="icon-sm" aria-label="Deactivate"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={toggleStatus.isPending}
                      onClick={() => toggleStatus.mutate({ id: u.id, active: false })}>
                      <UserX className="size-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon-sm" aria-label="Activate"
                      className="text-muted-foreground hover:text-emerald-600"
                      disabled={toggleStatus.isPending}
                      onClick={() => toggleStatus.mutate({ id: u.id, active: true })}>
                      <UserCheck className="size-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-muted-foreground"
                    onClick={() => setResetTarget(u)}>
                    <KeyRound className="size-4" />
                    Reset
                  </Button>
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
                <TableHead className="px-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users as UserSummary[]).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="px-4 font-medium">{u.firstName} {u.lastName}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Combobox
                      options={ROLES}
                      value={u.role}
                      onValueChange={(role) => role && changeRole.mutate({ id: u.id, role })}
                      className="w-36"
                      emptyText="No role."
                    />
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadge(u.status)}>{u.status}</Badge>
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {u.status === 'Active' ? (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
                          disabled={toggleStatus.isPending}
                          onClick={() => toggleStatus.mutate({ id: u.id, active: false })}>
                          <UserX className="size-4" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-emerald-600"
                          disabled={toggleStatus.isPending}
                          onClick={() => toggleStatus.mutate({ id: u.id, active: true })}>
                          <UserCheck className="size-4" />
                          Activate
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-muted-foreground"
                        onClick={() => setResetTarget(u)}>
                        <KeyRound className="size-4" />
                        Reset password
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="flex-row items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--du-primary)]">
              <UserPlus className="size-5" />
            </span>
            <div className="grid gap-0.5">
              <DialogTitle>Invite user</DialogTitle>
              <DialogDescription>
                They'll receive an account with a temporary password.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form
            className="grid gap-4"
            noValidate
            onSubmit={(e) => { e.preventDefault(); submitInvite() }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" value={inviteForm.firstName} autoFocus
                  aria-invalid={!!inviteErrors.firstName}
                  onChange={(e) => updateInvite({ firstName: e.target.value })} />
                {inviteErrors.firstName && <FieldError>{inviteErrors.firstName}</FieldError>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" value={inviteForm.lastName}
                  aria-invalid={!!inviteErrors.lastName}
                  onChange={(e) => updateInvite({ lastName: e.target.value })} />
                {inviteErrors.lastName && <FieldError>{inviteErrors.lastName}</FieldError>}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={inviteForm.email}
                aria-invalid={!!inviteErrors.email}
                onChange={(e) => updateInvite({ email: e.target.value })} />
              {inviteErrors.email && <FieldError>{inviteErrors.email}</FieldError>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="role">Role</Label>
                <Combobox
                  id="role"
                  options={ROLES}
                  value={inviteForm.role}
                  onValueChange={(role) => updateInvite({ role })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Combobox
                  id="timezone"
                  options={TIMEZONES}
                  value={inviteForm.timezone}
                  onValueChange={(tz) => updateInvite({ timezone: tz })}
                  placeholder="Search timezone…"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button type="submit" className={tealBtn} disabled={invite.isPending}>
                {invite.isPending ? 'Inviting…' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="newPassword">
              New password for <span className="font-medium text-foreground">{resetTarget?.email}</span>
            </Label>
            <Input id="newPassword" type="password" minLength={8} value={newPassword}
              placeholder="Min. 8 characters"
              aria-invalid={newPassword.length > 0 && newPassword.length < 8}
              onChange={(e) => setNewPassword(e.target.value)} />
            {newPassword.length > 0 && newPassword.length < 8 && (
              <FieldError>Password must be at least 8 characters.</FieldError>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button className={tealBtn}
              onClick={() => resetPassword.mutate()}
              disabled={resetPassword.isPending || newPassword.length < 8}>
              {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
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
