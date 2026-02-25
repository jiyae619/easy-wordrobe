/**
 * Compresses a base64 image to reduce size for localStorage storage.
 * Uses canvas to resize and recompress the image.
 */
export function compressImage(base64: string, maxWidth = 400, quality = 0.7): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Scale down if wider than maxWidth
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            } else {
                // Fallback: return original (may exceed localStorage)
                resolve(base64);
            }
        };
        img.onerror = () => {
            resolve(base64); // fallback
        };
        img.src = base64;
    });
}
