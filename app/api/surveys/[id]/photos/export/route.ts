// Use the Web Fetch API `Request` type; avoid narrowing Next's context type
import archiver from 'archiver';
import path from 'node:path';
import { Readable } from 'node:stream';
import { getUrl } from 'aws-amplify/storage';

export const runtime = 'nodejs';

type ExportItem = {
  imagePath: string;
  fileName?: string;
  isArchived?: boolean;
  // Optional client-provided destination override
  destPath?: string; // full path inside zip (e.g., "Exterior / Roof/a.jpg")
  destFolder?: string; // folder inside zip (e.g., "Exterior / Roof")
  dataUrl?: string; // optional data URL thumbnail fallback
  fullUrl?: string; // optional pre-signed full URL from client
};

function sanitizeName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]/g, '-');
  // Collapse whitespace and dashes
  return trimmed.replace(/\s+/g, ' ').replace(/-{2,}/g, '-').slice(0, 120);
}

function basename(p: string): string {
  try {
    const base = path.posix.basename(p);
    return base || 'image';
  } catch {
    const parts = String(p || '').split('/');
    return parts[parts.length - 1] || 'image';
  }
}

type ParsedPath =
  | { kind: 'cover' }
  | { kind: 'front' }
  | { kind: 'report' }
  | { kind: 'element'; elementId: string }
  | { kind: 'inspection'; inspectionId: string };

function parseImagePath(imagePath: string, surveyId: string): ParsedPath | null {
  const p = String(imagePath || '');
  const normalized = p.replace(/^\/+|\/+$/g, '');
  const segments = normalized.split('/').filter(Boolean);

  if (p.includes('/money-shot/') || p.includes('moneyShot')) return { kind: 'cover' };
  if (p.includes('/front-elevation/') || p.includes('frontElevation')) return { kind: 'front' };

  const idxReport = segments.indexOf('report-images');
  if (idxReport === -1) return null;
  const sid = segments[idxReport + 1];
  if (!sid || sid !== surveyId) return null;

  const afterSurvey = segments.slice(idxReport + 2);
  if (afterSurvey.length === 0) return { kind: 'report' };
  const [folder, idOrNext] = afterSurvey;
  if (folder === 'elements' && idOrNext) return { kind: 'element', elementId: idOrNext };
  if (folder === 'inspections' && idOrNext) return { kind: 'inspection', inspectionId: idOrNext };
  return { kind: 'report' };
}

function destinationPathFor(image: ExportItem, surveyId: string): string {
  if (image.destPath) {
    return image.destPath.split('..').join('');
  }
  const parsed = parseImagePath(image.imagePath, surveyId);
  const file = sanitizeName(image.fileName || basename(image.imagePath));
  if (image.destFolder) {
    return path.posix.join(image.destFolder, file);
  }
  if (!parsed) return path.posix.join('Report Images', file);
  switch (parsed.kind) {
    case 'cover':
      return path.posix.join('Cover Image', file);
    case 'front':
      return path.posix.join('Front Elevation', file);
    case 'report':
      return path.posix.join('Report Images', file);
    case 'element':
      // We don't resolve names server-side yet; keep structural folder
      return path.posix.join('Elements', parsed.elementId, file);
    case 'inspection':
      return path.posix.join('Inspections', parsed.inspectionId, file);
  }
}

async function fetchAsNodeStream(url: string): Promise<Readable> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Fetch failed: ${res.status}`);
  // Convert Web ReadableStream to Node stream for archiver
  // @ts-ignore
  if (typeof Readable.fromWeb === 'function') return Readable.fromWeb(res.body);
  // Fallback: buffer
  const buf = Buffer.from(await res.arrayBuffer());
  const stream = Readable.from(buf);
  return stream;
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; ext: string } | null {
  try {
    const m = /^data:([^;]+);base64,(.*)$/i.exec(dataUrl);
    if (!m) return null;
    const mime = m[1] || 'application/octet-stream';
    const b64 = m[2] || '';
    const buffer = Buffer.from(b64, 'base64');
    let ext = 'bin';
    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
    else if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    return { buffer, ext };
  } catch {
    return null;
  }
}

export async function POST(
  req: Request,
  context: { params: Record<string, string | string[]> },
) {
  try {
    const idParam = context?.params?.id;
    const surveyId = Array.isArray(idParam) ? idParam[0] : idParam;
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Expect a JSON body with items to export.
    // This keeps server logic simple and avoids complex server-side querying here.
    const body = await req.json().catch(() => ({ items: [] }));
    const items: ExportItem[] = Array.isArray(body?.items) ? body.items : [];

    // Basic validation and prefix enforcement
    const filtered = items.filter((it) => {
      if (!it?.imagePath) return false;
      if (it?.isArchived && !includeArchived) return false;
      const raw = String(it.imagePath || '');
      const normalized = raw.replace(/^\/+/, '');
      const okPrefix =
        normalized.startsWith(`report-images/${surveyId}/`) ||
        normalized.startsWith(`surveys/${surveyId}/`);
      return okPrefix;
    });

    if (filtered.length === 0) {
      return new Response(JSON.stringify({ error: 'No images to export' }), { status: 400 });
    }

    const zipName = `survey-${surveyId}-photos.zip`;

    const stream = new Readable({
      read() {},
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      stream.destroy(err);
    });
    archive.on('warning', (err) => {
      if ((err as any).code === 'ENOENT') {
        // log and continue
        console.warn('[export] warning:', err.message);
      } else {
        stream.destroy(err);
      }
    });

    // Pipe archive output to our stream
    // @ts-ignore
    archive.on('data', (chunk) => stream.push(chunk));
    archive.on('end', () => stream.push(null));

    // Kick off appending files
    (async () => {
      for (const item of filtered) {
        try {
          let appended = false;
          try {
            const href = item.fullUrl || (await getUrl({ path: item.imagePath })).url.href;
            const fileStream = await fetchAsNodeStream(href);
            const name = destinationPathFor(item, surveyId);
            archive.append(fileStream, { name });
            appended = true;
          } catch (fetchErr) {
            // Fall back to dataUrl if provided
            if (item.dataUrl) {
              const parsed = dataUrlToBuffer(item.dataUrl);
              if (parsed) {
                const baseName = sanitizeName(item.fileName || basename(item.imagePath));
                const name = destinationPathFor(
                  {
                    ...item,
                    fileName: baseName.endsWith(`.${parsed.ext}`)
                      ? baseName
                      : `${baseName}.${parsed.ext}`,
                  },
                  surveyId,
                );
                archive.append(parsed.buffer, { name });
                appended = true;
              }
            }
            if (!appended) throw fetchErr;
          }
        } catch (err) {
          console.error('[export] skipping item due to error', item.imagePath, err);
          continue;
        }
      }
      await archive.finalize();
    })();

    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Disposition', `attachment; filename="${zipName}"`);

    return new Response(stream as any, { headers });
  } catch (error) {
    console.error('[export] fatal error', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), { status: 500 });
  }
}
