import { describe, expect, it } from 'vitest';
import { parseExifDate, readExifDate, readPhotoDate } from '../photoDate';

/** A minimal JPEG: SOI + APP1/EXIF with IFD0 → ExifIFD → DateTimeOriginal, then SOS. */
function jpegWithExif(date: string, littleEndian = true, original = true): ArrayBuffer {
    const tiff: number[] = [];
    const u16 = (v: number) => (littleEndian ? [v & 255, v >> 8] : [v >> 8, v & 255]);
    const u32 = (v: number) => (littleEndian ? [v & 255, (v >> 8) & 255, (v >> 16) & 255, v >>> 24] : [v >>> 24, (v >> 16) & 255, (v >> 8) & 255, v & 255]);
    const ascii = [...date].map((c) => c.charCodeAt(0)).concat(0);
    // TIFF header: byte order, 42, IFD0 at 8
    tiff.push(...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]), ...u16(42), ...u32(8));
    if (original) {
        // IFD0 (8): 1 entry → ExifIFD pointer at 26
        tiff.push(...u16(1), ...u16(0x8769), ...u16(4), ...u32(1), ...u32(26), ...u32(0));
        // ExifIFD (26): 1 entry → DateTimeOriginal string at 44
        tiff.push(...u16(1), ...u16(0x9003), ...u16(2), ...u32(ascii.length), ...u32(44), ...u32(0));
    } else {
        // IFD0 (8): DateTime string at 26
        tiff.push(...u16(1), ...u16(0x0132), ...u16(2), ...u32(ascii.length), ...u32(26), ...u32(0));
    }
    tiff.push(...ascii);
    const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]; // "Exif\0\0" + TIFF
    const size = app1.length + 2;
    const bytes = [0xff, 0xd8, 0xff, 0xe1, size >> 8, size & 255, ...app1, 0xff, 0xda, 0, 2];
    return new Uint8Array(bytes).buffer;
}

describe('photo date', () => {
    it('reads DateTimeOriginal in either byte order', () => {
        expect(readExifDate(jpegWithExif('2026:10:02 18:41:07'))).toEqual(new Date(2026, 9, 2, 18, 41, 7));
        expect(readExifDate(jpegWithExif('2026:09:28 08:05:00', false))).toEqual(new Date(2026, 8, 28, 8, 5, 0));
    });

    it('falls back to DateTime in IFD0', () => {
        expect(readExifDate(jpegWithExif('2026:07:14 12:00:00', true, false))).toEqual(new Date(2026, 6, 14, 12));
    });

    it('returns null for non-JPEG data or junk dates', () => {
        expect(readExifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
        expect(parseExifDate('0000:00:00 00:00:00')).toBeNull();
    });

    it('uses an old file date when there is no EXIF, but not a fresh copy', async () => {
        const now = new Date(2026, 9, 5, 12);
        const old = new File([new Uint8Array([1, 2, 3])], 'a.png', { lastModified: new Date(2026, 9, 1, 9).getTime() });
        const fresh = new File([new Uint8Array([1, 2, 3])], 'b.png', { lastModified: now.getTime() - 60_000 });
        expect(await readPhotoDate(old, now)).toEqual({ date: new Date(2026, 9, 1, 9), source: 'file' });
        expect(await readPhotoDate(fresh, now)).toBeNull();
    });

    it('prefers EXIF over the file date and ignores future dates', async () => {
        const now = new Date(2026, 9, 5, 12);
        const shot = new File([jpegWithExif('2026:10:03 19:00:00')], 'c.jpg', { lastModified: now.getTime() });
        expect(await readPhotoDate(shot, now)).toEqual({ date: new Date(2026, 9, 3, 19), source: 'photo' });
        const future = new File([jpegWithExif('2027:01:01 10:00:00')], 'd.jpg', { lastModified: now.getTime() });
        expect(await readPhotoDate(future, now)).toBeNull();
    });
});
