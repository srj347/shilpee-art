import { Suspense } from 'react'
import { SignInForm } from '@/components/admin/SignInForm'

export const metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <main className="signin">
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  )
}
