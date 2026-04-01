import { useGunpla } from '../context/GunplaContext'

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '已拥有', value: 'owned' },
  { label: '愿望清单', value: 'wishlist' },
]

function Sidebar() {
  const { filterState, setFilterState, allTags, categoryConfig, buildStatusConfig } =
    useGunpla()
  const { openManual } = useGunpla()

  const toggleListFilter = (key, value) => {
    setFilterState((prev) => {
      const list = prev[key]
      const exists = list.includes(value)
      return {
        ...prev,
        [key]: exists ? list.filter((item) => item !== value) : [...list, value],
      }
    })
  }

  return (
    <aside className="w-60 border-r border-zinc-800 bg-zinc-900/85 backdrop-blur-sm overflow-y-auto p-5 space-y-8">
      <section>
        <h2 className="mb-3 text-zinc-200 text-sm font-semibold uppercase tracking-wider">
          类型
        </h2>
        <div className="space-y-2">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilterState((prev) => ({ ...prev, type: option.value }))}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                filterState.type === option.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:brightness-110'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-zinc-200 text-sm font-semibold uppercase tracking-wider">
          Grade
        </h2>
        <div className="space-y-2">
          {categoryConfig.grade.map((grade) => (
            <label key={grade} className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={filterState.grades.includes(grade)}
                onChange={() => toggleListFilter('grades', grade)}
                type="checkbox"
                className="accent-blue-500 h-4 w-4"
              />
              {grade}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-zinc-200 text-sm font-semibold uppercase tracking-wider">
          拼装状态
        </h2>
        <div className="space-y-2">
          {buildStatusConfig.map((status) => (
            <label
              key={status}
              className="flex items-center gap-2 text-sm text-zinc-300"
            >
              <input
                checked={filterState.buildStatuses.includes(status)}
                onChange={() => toggleListFilter('buildStatuses', status)}
                type="checkbox"
                className="accent-blue-500 h-4 w-4"
              />
              {status}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-zinc-200 text-sm font-semibold uppercase tracking-wider">
          Series
        </h2>
        <div className="space-y-2">
          {categoryConfig.series.map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                checked={filterState.series.includes(item)}
                onChange={() => toggleListFilter('series', item)}
                type="checkbox"
                className="accent-blue-500 h-4 w-4"
              />
              {item}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-zinc-200 text-sm font-semibold uppercase tracking-wider">
          Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleListFilter('tags', tag)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filterState.tags.includes(tag)
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-blue-500 hover:text-zinc-100'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="pt-3">
        <button
          type="button"
          onClick={openManual}
          className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-700"
        >
          说明书目录
        </button>
      </section>
    </aside>
  )
}

export default Sidebar
