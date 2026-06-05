import Link from 'next/link'
import { ContractorForm } from '../ContractorForm'
import { createContractor } from '../actions'

export default function NewContractorPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/contractors" className="text-sm text-gray-500 hover:text-gray-700">
            ← Contractors
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Add Contractor</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ContractorForm action={createContractor} submitLabel="Add Contractor" />
        </div>
      </div>
    </main>
  )
}
