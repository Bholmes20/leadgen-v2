import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <span className="font-semibold text-gray-900 text-sm">Admin</span>
          <Link href="/admin/leads" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Leads
          </Link>
          <Link href="/admin/contractors" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Contractors
          </Link>
          <Link href="/admin/intelligence" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Intelligence
          </Link>
        </div>
      </nav>
      {children}
    </>
  )
}
