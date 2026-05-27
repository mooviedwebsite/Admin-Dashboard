import { useState, FormEvent, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Movie {
  id?: number;
  title: string;
  type: string;
  tagline?: string | null;
  description?: string | null;
  genres?: string[];
  year?: number | null;
  duration?: number | null;
  language?: string | null;
  country?: string | null;
  director?: string | null;
  cast?: string[];
  imdbRating?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  bannerUrl?: string | null;
  trailerUrl?: string | null;
  featured?: boolean;
  status?: string;
  labels?: string[];
  tags?: string[];
}

interface Props {
  movie?: Movie | null;
  defaultType?: "movie" | "series";
  onSave: () => void;
  onCancel: () => void;
}

function TagInput({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  }

  return (
    <div>
      <label className="block text-xs text-[#888] mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((v) => (
          <span key={v} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[#00ff7f]/10 text-[#00ff7f] border border-[#00ff7f]/20">
            {v}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== v))}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add ${label.toLowerCase()}…`}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[#161616] border border-white/[0.08] text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#00ff7f]/30"
        />
        <button type="button" onClick={add} className="px-3 py-1.5 rounded-lg bg-white/[0.06] text-white text-xs hover:bg-white/[0.1] transition-colors">
          Add
        </button>
      </div>
    </div>
  );
}

export default function MovieForm({ movie, defaultType = "movie", onSave, onCancel }: Props) {
  const isEdit = !!movie?.id;

  const [form, setForm] = useState({
    title: movie?.title ?? "",
    type: movie?.type ?? defaultType,
    tagline: movie?.tagline ?? "",
    description: movie?.description ?? "",
    year: movie?.year ? String(movie.year) : "",
    duration: movie?.duration ? String(movie.duration) : "",
    language: movie?.language ?? "",
    country: movie?.country ?? "",
    director: movie?.director ?? "",
    imdbRating: movie?.imdbRating ? String(movie.imdbRating) : "",
    posterUrl: movie?.posterUrl ?? "",
    backdropUrl: movie?.backdropUrl ?? "",
    bannerUrl: movie?.bannerUrl ?? "",
    trailerUrl: movie?.trailerUrl ?? "",
    featured: movie?.featured ?? false,
    status: movie?.status ?? "draft",
  });

  const [genres, setGenres] = useState<string[]>(movie?.genres ?? []);
  const [cast, setCast] = useState<string[]>(movie?.cast ?? []);
  const [labels, setLabels] = useState<string[]>(movie?.labels ?? []);
  const [tags, setTags] = useState<string[]>(movie?.tags ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadFile(file: File, field: string) {
    setUploadingField(field);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "movies");
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${import.meta.env.VITE_CF_WORKER_URL || ""}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string };
      set(field, data.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingField(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        year: form.year ? Number(form.year) : null,
        duration: form.duration ? Number(form.duration) : null,
        imdbRating: form.imdbRating ? Number(form.imdbRating) : null,
        genres,
        cast,
        labels,
        tags,
      };
      if (isEdit) {
        await apiFetch(`/admin/movies/${movie!.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await apiFetch("/admin/movies", { method: "POST", body: JSON.stringify(body) });
      }
      onSave();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg bg-[#161616] border border-white/[0.08] text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#00ff7f]/40 transition-colors";
  const labelClass = "block text-xs text-[#888] mb-1.5";

  function ImageField({ field, label }: { field: "posterUrl" | "backdropUrl" | "bannerUrl"; label: string }) {
    return (
      <div>
        <label className={labelClass}>{label}</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={form[field]}
            onChange={(e) => set(field, e.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
          <label className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#161616] border border-white/[0.08] text-xs text-[#888] hover:text-white hover:border-white/[0.15] transition-colors cursor-pointer">
            {uploadingField === field ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], field)}
            />
          </label>
        </div>
        {form[field] && (
          <img src={form[field]} alt="" className="mt-2 h-20 rounded object-cover border border-white/[0.06]" />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="w-full max-w-2xl bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="font-semibold text-white">{isEdit ? "Edit" : "Add"} {form.type === "series" ? "TV Series" : "Movie"}</h2>
          <button onClick={onCancel} className="text-[#666] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>Title *</label>
              <input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Title" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputClass + " bg-[#161616]"}>
                <option value="movie">Movie</option>
                <option value="series">TV Series</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass + " bg-[#161616]"}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Year</label>
              <input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="2024" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Duration (min)</label>
              <input type="number" value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="120" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>IMDB Rating</label>
              <input type="number" step="0.1" min="0" max="10" value={form.imdbRating} onChange={(e) => set("imdbRating", e.target.value)} placeholder="7.5" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Language</label>
              <input value={form.language} onChange={(e) => set("language", e.target.value)} placeholder="English" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Country</label>
              <input value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="USA" className={inputClass} />
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Director</label>
              <input value={form.director} onChange={(e) => set("director", e.target.value)} placeholder="Director name" className={inputClass} />
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Tagline</label>
              <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="A short tagline…" className={inputClass} />
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Synopsis…"
                className={inputClass + " resize-none"}
              />
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Trailer URL</label>
              <input type="url" value={form.trailerUrl} onChange={(e) => set("trailerUrl", e.target.value)} placeholder="https://youtube.com/…" className={inputClass} />
            </div>

            <div className="col-span-2">
              <ImageField field="posterUrl" label="Poster" />
            </div>
            <div className="col-span-2">
              <ImageField field="backdropUrl" label="Backdrop" />
            </div>
            <div className="col-span-2">
              <ImageField field="bannerUrl" label="Banner" />
            </div>

            <div className="col-span-2">
              <TagInput label="Genres" value={genres} onChange={setGenres} />
            </div>
            <div className="col-span-2">
              <TagInput label="Cast" value={cast} onChange={setCast} />
            </div>
            <div className="col-span-2">
              <TagInput label="Labels" value={labels} onChange={setLabels} />
            </div>
            <div className="col-span-2">
              <TagInput label="Tags" value={tags} onChange={setTags} />
            </div>

            <div className="col-span-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="featured"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="w-4 h-4 accent-[#00ff7f]"
              />
              <label htmlFor="featured" className="text-sm text-[#888]">Featured (show on homepage)</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.05]">
            <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg bg-white/[0.05] text-[#888] text-sm hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00ff7f] text-black font-semibold text-sm hover:bg-[#00e870] disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
