export const MAX_SQL_FILE_BYTES = 5 * 1024 * 1024;

export type ReadSqlFileResult =
  | { ok: true; sql: string; fileName: string }
  | { ok: false; error: string };

export function isAllowedSqlFileName(fileName: string): boolean {
  return fileName.trim().toLowerCase().endsWith(".sql");
}

export function validateSqlFile(file: File): ReadSqlFileResult | null {
  if (!isAllowedSqlFileName(file.name)) {
    return { ok: false, error: "Only .sql files are allowed." };
  }

  if (file.size === 0) {
    return { ok: false, error: "The selected file is empty." };
  }

  if (file.size > MAX_SQL_FILE_BYTES) {
    return { ok: false, error: "The selected file is too large (max 5 MB)." };
  }

  return null;
}

export function readSqlFile(file: File): Promise<ReadSqlFileResult> {
  const validationError = validateSqlFile(file);
  if (validationError) {
    return Promise.resolve(validationError);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      const sql = typeof reader.result === "string" ? reader.result : "";
      if (!sql.trim()) {
        resolve({ ok: false, error: "The selected file contains no SQL." });
        return;
      }

      resolve({ ok: true, sql, fileName: file.name });
    };

    reader.onerror = () => {
      resolve({ ok: false, error: "Could not read the selected file." });
    };

    reader.readAsText(file, "UTF-8");
  });
}
