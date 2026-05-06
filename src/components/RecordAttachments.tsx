import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, Trash2, ExternalLink, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export type AttachmentRecordType =
  | "deposit"
  | "withdrawal"
  | "cooperative_saving"
  | "share_investment"
  | "expense"
  | "expense_booking";

interface AttachmentRow {
  id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

interface Props {
  recordType: AttachmentRecordType;
  recordId?: string | null;
  label?: string;
  disabled?: boolean;
  compact?: boolean;
}

const BUCKET = "record-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

const RecordAttachments = ({ recordType, recordId, label = "Supporting documents (images)", disabled, compact }: Props) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!recordId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("record_attachments")
        .select("id,file_path,file_name,mime_type,size_bytes,created_at")
        .eq("record_type", recordType)
        .eq("record_id", recordId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows((data as AttachmentRow[]) || []);
    } catch (e: any) {
      console.error("Failed to load attachments", e);
    } finally {
      setLoading(false);
    }
  }, [recordType, recordId]);

  useEffect(() => {
    load();
  }, [load]);

  // Generate signed-URL previews for images
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        rows.map(async (r) => {
          if (!r.mime_type?.startsWith("image/")) return;
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.file_path, 3600);
          if (data?.signedUrl) next[r.id] = data.signedUrl;
        }),
      );
      if (!cancelled) setPreviews(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!recordId) {
      toast.error("Save the record first, then add images.");
      return;
    }
    if (!user) {
      toast.error("You must be signed in.");
      return;
    }
    setUploading(true);
    try {
      const uploads = Array.from(files).filter((f) => {
        if (!f.type.startsWith("image/")) {
          toast.error(`${f.name} is not an image`);
          return false;
        }
        if (f.size > MAX_BYTES) {
          toast.error(`${f.name} exceeds 10MB`);
          return false;
        }
        return true;
      });
      for (const file of uploads) {
        const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
        const path = `${recordType}/${recordId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from("record_attachments").insert({
          record_type: recordType,
          record_id: recordId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          uploaded_by: user.id,
        });
        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insErr;
        }
      }
      toast.success(`${uploads.length} file(s) uploaded`);
      if (inputRef.current) inputRef.current.value = "";
      await load();
    } catch (e: any) {
      toast.error(`Upload failed: ${e?.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row: AttachmentRow) => {
    if (!confirm(`Delete ${row.file_name}?`)) return;
    try {
      const { error: delErr } = await supabase.from("record_attachments").delete().eq("id", row.id);
      if (delErr) throw delErr;
      await supabase.storage.from(BUCKET).remove([row.file_path]);
      toast.success("Attachment deleted");
      await load();
    } catch (e: any) {
      toast.error(`Delete failed: ${e?.message || "Unknown error"}`);
    }
  };

  const openFile = async (row: AttachmentRow) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_path, 3600);
    if (error || !data?.signedUrl) {
      toast.error("Could not open file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3 border rounded-md p-3 bg-muted/30"}>
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          {label}
          {rows.length > 0 && <span className="text-muted-foreground">({rows.length})</span>}
        </Label>
        <div>
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || uploading || !recordId}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
            id={`attach-input-${recordType}-${recordId || "new"}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading || !recordId}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            <span className="ml-2">Add Images</span>
          </Button>
        </div>
      </div>

      {!recordId && (
        <p className="text-xs text-muted-foreground">Save this record first to attach images.</p>
      )}

      {loading ? (
        <div className="flex items-center text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading attachments...
        </div>
      ) : rows.length === 0 ? (
        recordId && <p className="text-xs text-muted-foreground">No supporting documents uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {rows.map((r) => (
            <div key={r.id} className="border rounded-md overflow-hidden bg-background flex flex-col">
              <button
                type="button"
                onClick={() => openFile(r)}
                className="aspect-square bg-muted flex items-center justify-center hover:opacity-80 transition"
                title={r.file_name}
              >
                {previews[r.id] ? (
                  <img src={previews[r.id]} alt={r.file_name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
              <div className="p-1.5 flex items-center justify-between gap-1">
                <span className="text-[10px] truncate flex-1" title={r.file_name}>
                  {r.file_name}
                </span>
                <button
                  type="button"
                  onClick={() => openFile(r)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Open"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Delete"
                  disabled={disabled}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecordAttachments;
