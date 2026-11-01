import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { CATEGORY } from '../categories'
import { centsToInput, parseAmount } from '../format'
import { isNative } from '../native'
import { sanitize, useStore } from '../store'

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

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function Settings({ notify }: { notify: (message: string) => void }) {
  const store = useStore()
  const { settings, expenses } = store
  const [budgetText, setBudgetText] = useState(settings.budget ? centsToInput(settings.budget) : '')
  const [canInstall, setCanInstall] = useState(() => deferredPrompt !== null)
  const fileRef = useRef<HTMLInputElement>(null)
  const standalone = isNative || isStandalone()

  useEffect(() => {
    const onPrompt = () => setCanInstall(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

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
      store.replaceAll(data)
      setBudgetText(data.settings.budget ? centsToInput(data.settings.budget) : '')
      notify('Backup restored')
    } catch {
      notify("That file isn't a spendy backup")
    }
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

      <h2 className="group-title">Budget</h2>
      <div className="card settings-group">
        <label className="settings-row">
          <span>Monthly budget (₹)</span>
          <input
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
        spendy keeps everything on this device. Nothing is uploaded anywhere — back up now and then so you don't lose
        it.
      </p>
    </main>
  )
}
