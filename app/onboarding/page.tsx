import {AccountGate} from '@/components/account-gate';
import Link from 'next/link';
export default function OnboardingPage(){return <AccountGate><main className="mx-auto max-w-xl px-4 py-16"><h1 className="mb-3 text-3xl font-semibold">Your preferences are ready.</h1><Link href="/profile" className="text-sm underline">Edit preferences</Link><Link href="/" className="ml-5 text-sm underline">Find pieces</Link></main></AccountGate>}
