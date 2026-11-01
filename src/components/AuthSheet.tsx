import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { Sheet } from './Sheet'

function friendlyError(err: unknown) {
  const e = err as { message?: string; status?: number; code?: string }
  const msg = (e.message ?? '').toLowerCase()
  if (!navigator.onLine || msg.includes('failed to fetch') || msg.includes('network'))
    return "You're offline. Connect to the internet and try again."
  if (e.status === 429 || msg.includes('rate limit') || msg.includes('security purposes'))
    return 'Too many attempts. Wait a minute and try again.'
  if (msg.includes('expired') || msg.includes('invalid') || e.code === 'otp_expired')
    return 'That code is wrong or has expired. Check the latest email or send a new one.'
  if (msg.includes('email')) return "That email address doesn't look right."
  return 'Something went wrong. Please try again.'
}

export function AuthSheet({ onClose, onSignedIn }: { onClose: () => void; onSignedIn: () => void }) {
  const { sendCode, verifyCode } = useStore()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const requestCode = () =>
    run(async () => {
      await sendCode(email.trim())
      setStep('code')
      setCode('')
      setResendIn(60)
    })

  const submit = () => {
    if (step === 'email') return requestCode()
    return run(async () => {
      await verifyCode(email.trim(), code.trim())
      onSignedIn()
    })
  }

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim())
  const codeValid = /^\d{6,10}$/.test(code.trim())

  return (
    <Sheet title={step === 'email' ? 'Sign in' : 'Enter code'} onClose={onClose} onSubmit={submit}>
      {step === 'email' ? (
        <>
          <p className="sheet__lead">
            Enter your email and we'll send you a sign-in code. New here? This creates your account.
          </p>
          <input
            ref={inputRef}
            className="text-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="off"
            enterKeyHint="send"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email"
          />
        </>
      ) : (
        <>
          <p className="sheet__lead">
            We sent a code to <strong>{email.trim()}</strong>. It can take a minute to arrive.
          </p>
          <input
            ref={inputRef}
            className="text-input text-input--code"
            inputMode="numeric"
            autoComplete="one-time-code"
            enterKeyHint="done"
            placeholder="123456"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-label="Sign-in code"
          />
        </>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn btn--primary btn--block"
        disabled={busy || (step === 'email' ? !emailValid : !codeValid)}
      >
        {busy ? 'Please wait…' : step === 'email' ? 'Send code' : 'Sign in'}
      </button>

      {step === 'code' && (
        <div className="sheet__links">
          <button type="button" className="link-btn" onClick={() => setStep('email')}>
            Use a different email
          </button>
          <button type="button" className="link-btn" disabled={busy || resendIn > 0} onClick={requestCode}>
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </button>
        </div>
      )}
    </Sheet>
  )
}
