type Contractor = {
  name: string
  phone: string
  email: string | null
  priority_rank: number
  quotes_from_photos: number
}

type Props = {
  action: (formData: FormData) => Promise<void>
  contractor?: Contractor
  junkZips?: string
  landscapingZips?: string
  submitLabel?: string
}

export function ContractorForm({
  action,
  contractor,
  junkZips = '',
  landscapingZips = '',
  submitLabel = 'Save Contractor',
}: Props) {
  return (
    <form action={action} className="space-y-6 max-w-lg">
      <div className="grid grid-cols-1 gap-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></span>
          <input
            name="name"
            required
            defaultValue={contractor?.name ?? ''}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></span>
          <input
            name="phone"
            required
            defaultValue={contractor?.phone ?? ''}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={contractor?.email ?? ''}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Priority Rank</span>
          <p className="text-xs text-gray-400 mt-0.5">Lower number = higher priority (e.g., 1 is top)</p>
          <input
            name="priority_rank"
            type="number"
            min="1"
            defaultValue={contractor?.priority_rank ?? 100}
            className="mt-1 block w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            name="quotes_from_photos"
            type="checkbox"
            defaultChecked={contractor?.quotes_from_photos === 1}
            className="rounded border-gray-300 text-gray-900 focus:ring-gray-400"
          />
          <span className="text-sm font-medium text-gray-700">Can quote from photos</span>
        </label>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Coverage — enter comma-separated ZIP codes</p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Junk Removal</span>
            <input
              name="coverage_junk-removal"
              defaultValue={junkZips}
              placeholder="30901, 30904, 30906"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Landscaping</span>
            <input
              name="coverage_landscaping"
              defaultValue={landscapingZips}
              placeholder="30901, 30904, 30906"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="bg-gray-900 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  )
}
