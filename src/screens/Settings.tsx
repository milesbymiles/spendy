import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AuthSheet } from '../components/AuthSheet'
import { CATEGORY } from '../categories'
import { sanitize } from '../data'
import { centsToInput, parseAmount } from '../format'
import { isNative } from '../native'
import { useStore, type SyncStatus } from '../store'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

let deferredPrompt: BeforeInstallPromptEvent | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
})

async function saveFile(name: string, type: string, contents: string) {
  if (isNative) {
    // WKWebView can't download files, so write to the cache and hand it to the iOS share sheet.
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: name, files: [uri] }).catch(() => {})
    return
  }
  const file = new File([contents], name, { type })
  // On phones the share sheet is the friendliest way to get a file out.
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function syncLabel(status: SyncStatus, pending: number) {
  if (status === 'syncing') return 'Syncing…'
  if (status === 'offline') return pending ? `Offline · ${pending} change${pending === 1 ? '' : 's'} waiting` : 'Offline'
  if (status === 'error') return "Couldn't sync · will retry"
  if (pending) return `${pending} change${pending === 1 ? '' : 's'} waiting to sync`
  return 'All changes synced'
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function Settings({ notify }: { notify: (message: string) => void }) {
  const store = useStore()
  const { settings, expenses } = store
  const [budgetText, setBudgetText] = useState(settings.budget ? centsToInput(settings.budget) : '')
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null)
  const [authOpen, setAuthOpen] = useState(false)
  const budgetRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const standalone = isNative || isStandalone()

  useEffect(() => {
    const onPrompt = () => setCanInstall(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  // Show budgets that arrive from another device, unless the field is being edited.
  useEffect(() => {
    if (document.activeElement !== budgetRef.current) setBudgetText(settings.budget ? centsToInput(settings.budget) : '')
  }, [settings.budget])

  const commitBudget = () => {
    const cents = budgetText.trim() ? parseAmount(budgetText) : null
    store.updateSettings({ budget: cents })
    setBudgetText(cents ? centsToInput(cents) : '')
  }

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    setCanInstall(false)
  }

  const stamp = new Date().toISOString().slice(0, 10)

  const exportCsv = () => {
    const rows = [['date', 'category', 'amount_inr', 'note']]
    for (const e of expenses) {
      rows.push([e.date, CATEGORY[e.category].label, (e.amount / 100).toFixed(2), e.note])
    }
    saveFile(`spendy-${stamp}.csv`, 'text/csv', rows.map((r) => r.map(csvCell).join(',')).join('\n'))
  }

  const exportBackup = () =>
    saveFile(
      `spendy-backup-${stamp}.json`,
      'application/json',
      JSON.stringify({ app: 'spendy', version: 1, expenses, settings }, null, 2),
    )

  const importBackup = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = sanitize(JSON.parse(await file.text()))
      if (!data) throw new Error('bad file')
      if (!confirm(`Replace your current data with ${data.expenses.length} expenses from this backup?`)) return
      store.replaceAll(data.expenses, data.settings)
      setBudgetText(data.settings.budget ? centsToInput(data.settings.budget) : '')
      notify('Backup restored')
    } catch {
      notify("That file isn't a spendy backup")
    }
  }

  const signOut = async () => {
    const warning = store.pendingCount
      ? `${store.pendingCount} change${store.pendingCount === 1 ? " hasn't" : "s haven't"} synced yet and will be lost. `
      : ''
    if (!confirm(`${warning}Sign out? Your expenses stay safe in your account and are removed from this device.`)) return
    await store.signOut()
    notify('Signed out')
  }

  const deleteAll = () => {
    if (confirm(`Delete all ${expenses.length} expenses? This can't be undone.`)) {
      store.clearAll()
      notify('All expenses deleted')
    }
  }

  return (
    <main className="screen">
      <header className="screen__header">
        <h1 className="screen__title">Settings</h1>
      </header>

      {store.cloudEnabled && (
        <>
          <h2 className="group-title">Account</h2>
          {!store.authReady ? (
            <div className="card settings-group settings-group--padded">
              <p className="hint">Checking your account…</p>
            </div>
          ) : store.account ? (
            <div className="card settings-group">
              <div className="settings-row settings-row--stack">
                <span className="account-email">{store.account.email}</span>
                <span className={`sync-status sync-status--${store.syncStatus}`}>
                  <span className="sync-status__dot" aria-hidden="true" />
                  {syncLabel(store.syncStatus, store.pendingCount)}
                </span>
              </div>
              <button
                className="settings-row settings-row--btn"
                onClick={store.syncNow}
                disabled={store.syncStatus === 'syncing'}
              >
                Sync now
              </button>
              <button className="settings-row settings-row--btn settings-row--danger" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="card settings-group settings-group--padded settings-group--stack">
              <p className="hint">
                {store.needsSignIn
                  ? 'You were signed out. Sign in again to keep syncing this device.'
                  : 'Sign in to back up your expenses and use them on any device.'}
              </p>
              <button className="btn btn--primary btn--block" onClick={() => setAuthOpen(true)}>
                Sign in with email
              </button>
            </div>
          )}
        </>
      )}

      <h2 className="group-title">Budget</h2>
      <div className="card settings-group">
        <label className="settings-row">
          <span>Monthly budget (₹)</span>
          <input
            ref={budgetRef}
            className="inline-input"
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="None"
            value={budgetText}
            onChange={(e) => setBudgetText(e.target.value)}
            onBlur={commitBudget}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </label>
      </div>

      {!standalone && (
        <>
          <h2 className="group-title">Install</h2>
          <div className="card settings-group settings-group--padded">
            {canInstall ? (
              <button className="btn btn--primary btn--block" onClick={install}>
                Add spendy to home screen
              </button>
            ) : isIOS() ? (
              <p className="hint">
                In Safari, tap <strong>Share</strong> then <strong>Add to Home Screen</strong> to install spendy like an
                app.
              </p>
            ) : (
              <p className="hint">
                Use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </p>
            )}
          </div>
        </>
      )}

      <h2 className="group-title">Your data</h2>
      <div className="card settings-group">
        <button className="settings-row settings-row--btn" onClick={exportCsv} disabled={!expenses.length}>
          Export as CSV
        </button>
        <button className="settings-row settings-row--btn" onClick={exportBackup}>
          Back up to file
        </button>
        <button className="settings-row settings-row--btn" onClick={() => fileRef.current?.click()}>
          Restore from backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importBackup} />
        <button
          className="settings-row settings-row--btn settings-row--danger"
          onClick={deleteAll}
          disabled={!expenses.length}
        >
          Delete all expenses
        </button>
      </div>

      <p className="footnote">
        {store.account
          ? 'Your expenses are saved on this device and synced to your account, so they work offline too.'
          : "Right now spendy keeps everything on this device only. Sign in, or back up now and then, so you don't lose it."}
      </p>

      {authOpen && (
        <AuthSheet
          onClose={() => setAuthOpen(false)}
          onSignedIn={() => {
            setAuthOpen(false)
            notify('Signed in · syncing your expenses')
          }}
        />
      )}
    </main>
  )
}
