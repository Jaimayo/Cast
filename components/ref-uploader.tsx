"use client";

import { useRef, useState } from "react";
import { PACK_REF_ACCEPT_ATTR, PACK_TARGET_REFS } from "@/lib/constants";
import { PACK_REF_FICTIONAL_COPY, PACK_REF_LIMITS_COPY } from "@/lib/pack-ref-upload";

export type LocalUpload = {
  id: string;
  name: string;
  previewUrl: string;
  progress: number;
  error: string | null;
};

function uploadPackRefFile(
  packId: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ refCount: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/packs/${packId}/refs/upload`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      const body = xhr.response as { error?: string; refCount?: number } | null;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ refCount: body?.refCount ?? 0 });
        return;
      }
      reject(new Error(body?.error ?? `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export function RefUploader(props: {
  packId?: string;
  refCount: number;
  disabled?: boolean;
  onNeedPack: () => Promise<string>;
  onUploaded: (packId: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const atCap = props.refCount >= PACK_TARGET_REFS;
  const blocked = props.disabled || atCap;

  async function onFiles(fileList: FileList | null) {
    if (!fileList || blocked) return;
    const files = Array.from(fileList);
    props.onError("");
    let packId = props.packId;
    try {
      if (!packId) {
        packId = await props.onNeedPack();
      }
    } catch (err) {
      props.onError(err instanceof Error ? err.message : "Name the character first");
      return;
    }

    for (const file of files) {
      const id = `${file.name}-${file.size}-${file.lastModified}`;
      const previewUrl = URL.createObjectURL(file);
      setUploads((prev) => [...prev, { id, name: file.name, previewUrl, progress: 0, error: null }]);
      try {
        await uploadPackRefFile(packId, file, (progress) => {
          setUploads((prev) => prev.map((row) => (row.id === id ? { ...row, progress } : row)));
        });
        URL.revokeObjectURL(previewUrl);
        setUploads((prev) => prev.filter((row) => row.id !== id));
        await props.onUploaded(packId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setUploads((prev) => prev.map((row) => (row.id === id ? { ...row, error: message, progress: 0 } : row)));
        props.onError(message);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="ref-uploader">
      <div className="row-between">
        <div>
          <h3>Reference pictures</h3>
          <p className="muted">
            {PACK_REF_LIMITS_COPY}. {PACK_REF_FICTIONAL_COPY}
          </p>
        </div>
        <button
          className="btn secondary"
          type="button"
          disabled={blocked}
          title={atCap ? "This pack is full. Remove one to add another." : "Add JPEG, PNG, or WebP stills"}
          onClick={() => inputRef.current?.click()}
        >
          Add pictures
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PACK_REF_ACCEPT_ATTR}
        multiple
        hidden
        disabled={blocked}
        onChange={(event) => void onFiles(event.target.files)}
      />
      {uploads.length > 0 ? (
        <ul className="upload-list">
          {uploads.map((row) => (
            <li key={row.id} className={row.error ? "upload-row is-fail" : "upload-row"}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="upload-thumb" src={row.previewUrl} alt="" />
              <div>
                <div>{row.name}</div>
                {row.error ? (
                  <p className="error">{row.error}</p>
                ) : (
                  <>
                    <div className="meter-track">
                      <div className="meter-fill" style={{ width: `${row.progress}%` }} />
                    </div>
                    <p className="muted">{row.progress < 100 ? `Uploading ${row.progress}%` : "Adding…"}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
