/**
 * When a photo was taken, read from its EXIF data (DateTimeOriginal, then DateTime). JPEG only:
 * phones hand photos to the browser as JPEG, and other formats rarely carry EXIF the browser keeps.
 * Pure byte parsing, no dependency; reads just the first 256 KB.
 */

const DATE_TIME = 0x0132;
const EXIF_IFD_POINTER = 0x8769;
const DATE_TIME_ORIGINAL = 0x9003;

/** "2026:10:02 18:41:07" → local Date, or null. */
export function parseExifDate(text: string): Date | null {
    const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(text.trim());
    if (!m) return null;
    const [y, mo, d, h, mi, s] = m.slice(1).map((v) => Number(v ?? 0));
    if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const date = new Date(y, mo - 1, d, h, mi, s || 0);
    return Number.isFinite(date.getTime()) ? date : null;
}

/** The capture date inside a JPEG's EXIF block, or null when there is none. */
export function readExifDate(buffer: ArrayBuffer): Date | null {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
        const marker = view.getUint16(offset);
        const size = view.getUint16(offset + 2);
        if ((marker & 0xff00) !== 0xff00 || size < 2) return null;
        if (marker === 0xffda) return null; // image data starts: no EXIF before it
        if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) { // "Exif"
            return readTiffDate(view, offset + 10, Math.min(view.byteLength, offset + 2 + size));
        }
        offset += 2 + size;
    }
    return null;
}

function readTiffDate(view: DataView, tiff: number, end: number): Date | null {
    if (tiff + 8 > end) return null;
    const order = view.getUint16(tiff);
    if (order !== 0x4949 && order !== 0x4d4d) return null;
    const le = order === 0x4949;
    const u16 = (at: number) => view.getUint16(at, le);
    const u32 = (at: number) => view.getUint32(at, le);

    /** Tag → value offset (or the inline value for LONG tags) within one IFD. */
    const readIfd = (ifd: number): Map<number, { count: number; at: number; value: number }> => {
        const tags = new Map<number, { count: number; at: number; value: number }>();
        if (ifd + 2 > end) return tags;
        const n = u16(ifd);
        for (let i = 0; i < n; i++) {
            const entry = ifd + 2 + i * 12;
            if (entry + 12 > end) break;
            const count = u32(entry + 4);
            tags.set(u16(entry), { count, at: entry + 8, value: u32(entry + 8) });
        }
        return tags;
    };
    const ascii = (tag?: { count: number; value: number }) => {
        if (!tag || tag.count < 19) return null;
        const start = tiff + tag.value;
        if (start + 19 > end) return null;
        let s = '';
        for (let i = 0; i < 19; i++) s += String.fromCharCode(view.getUint8(start + i));
        return parseExifDate(s);
    };

    const ifd0 = readIfd(tiff + u32(tiff + 4));
    const exifPointer = ifd0.get(EXIF_IFD_POINTER);
    const exif = exifPointer ? readIfd(tiff + exifPointer.value) : new Map();
    return ascii(exif.get(DATE_TIME_ORIGINAL)) ?? ascii(ifd0.get(DATE_TIME));
}

export type PhotoDateSource = 'photo' | 'file';

/**
 * Best guess at the day a photo was taken: its EXIF date, else the file's modified time when that
 * is clearly older than the upload (a fresh timestamp just means the browser made a copy).
 */
export async function readPhotoDate(file: File, now = new Date()): Promise<{ date: Date; source: PhotoDateSource } | null> {
    try {
        const exif = readExifDate(await file.slice(0, 256 * 1024).arrayBuffer());
        if (exif && exif.getTime() <= now.getTime()) return { date: exif, source: 'photo' };
    } catch {
        // Unreadable file: fall through to the file date.
    }
    const modified = file.lastModified ? new Date(file.lastModified) : null;
    if (modified && now.getTime() - modified.getTime() > 60 * 60 * 1000) return { date: modified, source: 'file' };
    return null;
}
