import { useState } from "react";
import { Upload, Loader2, CheckCircle, Copy } from "lucide-react";
import AdminLayout from "./layout";

export default function SettingsPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ url: string; key: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [copied, setCopied] = useState(false);

  const workerUrl = import.meta.env.VITE_CF_WORKER_URL || "(not set)";

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "media");
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`${import.meta.env.VITE_CF_WORKER_URL || ""}/api/admin/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json() as { url: string; key: string };
      setUploadResult(data);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function copyUrl() {
    if (!uploadResult) return;
    navigator.clipboard.writeText(uploadResult.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">Settings</h2>
          <p className="text-sm text-[#666]">Manage your platform configuration</p>
        </div>

        {/* API Config */}
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white text-sm">API Configuration</h3>
          <div>
            <label className="block text-xs text-[#888] mb-1.5">Cloudflare Worker URL</label>
            <div className="px-4 py-2.5 rounded-lg bg-[#161616] border border-white/[0.08] text-sm font-mono text-[#888]">
              {workerUrl}
            </div>
            <p className="text-xs text-[#555] mt-1.5">
              Set <code className="text-[#666]">VITE_CF_WORKER_URL</code> in your environment to point to your deployed Cloudflare Worker.
            </p>
          </div>
        </div>

        {/* Media Upload */}
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white text-sm">Media Upload (R2)</h3>
          <p className="text-xs text-[#666]">Upload files directly to Cloudflare R2 storage. Supports images, videos, and other media.</p>

          <label className={`flex flex-col items-center justify-center gap-3 h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
            uploading ? "border-[#00ff7f]/30 bg-[#00ff7f]/5" : "border-white/[0.08] hover:border-[#00ff7f]/30 hover:bg-[#00ff7f]/5"
          }`}>
            {uploading ? (
              <>
                <Loader2 size={28} className="text-[#00ff7f] animate-spin" />
                <span className="text-sm text-[#888]">Uploading…</span>
              </>
            ) : (
              <>
                <Upload size={28} className="text-[#555]" />
                <span className="text-sm text-[#888]">Click to upload a file</span>
                <span className="text-xs text-[#555]">Images, video, audio — any file type</span>
              </>
            )}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>

          {uploadError && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{uploadError}</div>
          )}

          {uploadResult && (
            <div className="bg-[#161616] border border-[#00ff7f]/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#00ff7f] text-sm font-medium">
                <CheckCircle size={16} /> File uploaded successfully
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">Public URL</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={uploadResult.url}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#111] border border-white/[0.08] text-xs text-[#aaa] font-mono"
                  />
                  <button
                    onClick={copyUrl}
                    className="px-3 py-2 rounded-lg bg-white/[0.06] text-xs text-[#888] hover:text-white transition-colors flex items-center gap-1"
                  >
                    {copied ? <CheckCircle size={12} className="text-[#00ff7f]" /> : <Copy size={12} />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">R2 Key</label>
                <p className="text-xs text-[#555] font-mono">{uploadResult.key}</p>
              </div>
            </div>
          )}
        </div>

        {/* Admin credentials info */}
        <div className="bg-[#111] border border-white/[0.06] rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-white text-sm">Admin Account</h3>
          <div className="text-sm text-[#666] space-y-2">
            <p>Admin credentials are managed via the Cloudflare Worker.</p>
            <p>Default admin email: <code className="text-[#aaa]">rawindunethsara93@gmail.com</code></p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
