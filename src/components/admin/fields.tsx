/** Plain server-rendered form fields for admin screens. */
const input = "min-h-11 w-full rounded-xl border border-sand-strong bg-white px-3 text-[15px] focus:border-forest-900";

export function TextInput({ name, label, defaultValue, hint, type = "text", required, maxLength }: { name: string; label: string; defaultValue?: string | number | null; hint?: string; type?: string; required?: boolean; maxLength?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} maxLength={maxLength} className={input} />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({ name, label, defaultValue, rows = 4, hint, maxLength }: { name: string; label: string; defaultValue?: string | null; rows?: number; hint?: string; maxLength?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={defaultValue ?? ""} maxLength={maxLength} className={`${input} py-2 font-[inherit]`} />
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Select({ name, label, options, defaultValue, hint }: { name: string; label: string; options: [string, string][]; defaultValue?: string | null; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`f-${name}`} className="text-sm font-semibold">
        {label}
      </label>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} className={input}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked, value = "on" }: { name: string; label: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="flex min-h-10 items-center gap-2 text-sm">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="h-5 w-5 accent-forest-900" />
      {label}
    </label>
  );
}

export function CheckboxList({ name, legend, options, selected }: { name: string; legend: string; options: [string, string][]; selected: string[] }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{legend}</legend>
      <div className="mt-1 grid max-h-64 gap-x-4 overflow-y-auto rounded-xl border border-sand bg-white p-2 sm:grid-cols-2">
        {options.length === 0 && <p className="p-2 text-sm text-ink-muted">Nothing to choose yet.</p>}
        {options.map(([v, l]) => (
          <Checkbox key={v} name={name} value={v} label={l} defaultChecked={selected.includes(v)} />
        ))}
      </div>
    </fieldset>
  );
}

export function ImageField({ name, label, currentUrl, altName, altDefault }: { name: string; label: string; currentUrl: string | null; altName: string; altDefault?: string | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[160px_1fr] sm:items-start">
      <div className="aspect-4/3 overflow-hidden rounded-xl bg-sand">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of the stored image
          <img src={currentUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-ink-muted">No image</p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`f-${name}`} className="text-sm font-semibold">
            {label}
          </label>
          <input id={`f-${name}`} name={name} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="text-sm" />
          <p className="text-xs text-ink-muted">JPEG, PNG, WebP or AVIF, up to 8 MB. Only use images you own or are licensed to use.</p>
        </div>
        <TextInput name={altName} label="Image description (alt text)" defaultValue={altDefault} hint="Describe the image for people using screen readers." maxLength={200} />
        {currentUrl && <Checkbox name="remove_image" label="Remove the current image" />}
      </div>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-sand-strong bg-white/60 p-5 sm:p-6">
      <h2 className="text-2xl font-semibold text-forest-900">{title}</h2>
      {children}
    </section>
  );
}
