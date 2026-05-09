import type { ItemBoundingBox } from "../types";

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

type CropResult = {
    image: string;
    usedFallback: boolean;
    reason?: "no_bbox" | "low_confidence" | "small_area" | "canvas_error" | "image_error";
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function toDataUrl(imageSrc: string): Promise<string | null> {
    if (imageSrc.startsWith("data:")) {
        return Promise.resolve(imageSrc);
    }

    return fetch(imageSrc)
        .then((response) => {
            if (!response.ok) {
                return null;
            }
            return response.blob();
        })
        .then((blob) => {
            if (!blob) {
                return null;
            }
            return new Promise<string | null>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        })
        .catch(() => null);
}

export function cropImageToBoundingBox(
    base64: string,
    bbox?: ItemBoundingBox,
    confidence?: number,
    options?: {
        paddingRatio?: number;
        minConfidence?: number;
        minAreaRatio?: number;
        targetWidth?: number;
        targetHeight?: number;
        quality?: number;
        zoomInFactor?: number;
    }
): Promise<CropResult> {
    return new Promise((resolve) => {
        const paddingRatio = options?.paddingRatio ?? 0.12;
        const minConfidence = options?.minConfidence ?? 0.45;
        const minAreaRatio = options?.minAreaRatio ?? 0.025;
        const targetWidth = options?.targetWidth ?? 510;
        const targetHeight = options?.targetHeight ?? 680;
        const quality = options?.quality ?? 0.85;
        const zoomInFactor = Math.max(1, options?.zoomInFactor ?? 1);

        if (!bbox) {
            resolve({ image: base64, usedFallback: true, reason: "no_bbox" });
            return;
        }

        if (typeof confidence === "number" && confidence < minConfidence) {
            resolve({ image: base64, usedFallback: true, reason: "low_confidence" });
            return;
        }

        if (bbox.width * bbox.height < minAreaRatio) {
            resolve({ image: base64, usedFallback: true, reason: "small_area" });
            return;
        }

        const img = new Image();
        img.onload = () => {
            const imageWidth = img.width;
            const imageHeight = img.height;

            const cropX = bbox.x * imageWidth;
            const cropY = bbox.y * imageHeight;
            const cropWidth = bbox.width * imageWidth;
            const cropHeight = bbox.height * imageHeight;

            const padX = cropWidth * paddingRatio;
            const padY = cropHeight * paddingRatio;

            const paddedX = clamp(cropX - padX, 0, imageWidth);
            const paddedY = clamp(cropY - padY, 0, imageHeight);
            const paddedRight = clamp(cropX + cropWidth + padX, 0, imageWidth);
            const paddedBottom = clamp(cropY + cropHeight + padY, 0, imageHeight);

            const finalCropWidth = Math.max(1, paddedRight - paddedX);
            const finalCropHeight = Math.max(1, paddedBottom - paddedY);
            const centerX = paddedX + finalCropWidth / 2;
            const centerY = paddedY + finalCropHeight / 2;

            const zoomedCropWidth = Math.max(1, finalCropWidth / zoomInFactor);
            const zoomedCropHeight = Math.max(1, finalCropHeight / zoomInFactor);
            const zoomedX = clamp(centerX - zoomedCropWidth / 2, 0, Math.max(0, imageWidth - zoomedCropWidth));
            const zoomedY = clamp(centerY - zoomedCropHeight / 2, 0, Math.max(0, imageHeight - zoomedCropHeight));

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve({ image: base64, usedFallback: true, reason: "canvas_error" });
                return;
            }
            // Use cover-fit when exporting thumbnails so no side blank bars are baked in.
            const scale = Math.max(targetWidth / zoomedCropWidth, targetHeight / zoomedCropHeight);
            const drawWidth = zoomedCropWidth * scale;
            const drawHeight = zoomedCropHeight * scale;
            const offsetX = (targetWidth - drawWidth) / 2;
            const offsetY = (targetHeight - drawHeight) / 2;

            ctx.drawImage(
                img,
                zoomedX,
                zoomedY,
                zoomedCropWidth,
                zoomedCropHeight,
                offsetX,
                offsetY,
                drawWidth,
                drawHeight
            );

            resolve({
                image: canvas.toDataURL("image/jpeg", quality),
                usedFallback: false,
            });
        };
        img.onerror = () => {
            resolve({ image: base64, usedFallback: true, reason: "image_error" });
        };
        img.src = base64;
    });
}

export function cropImageWithFocus(
    base64: string,
    focusXPercent = 50,
    focusYPercent = 50,
    zoom = 1.2,
    options?: {
        targetWidth?: number;
        targetHeight?: number;
        quality?: number;
    }
): Promise<string> {
    return new Promise((resolve) => {
        const targetWidth = options?.targetWidth ?? 510;
        const targetHeight = options?.targetHeight ?? 680;
        const quality = options?.quality ?? 0.85;
        const safeZoom = Math.max(1, Math.min(2.2, zoom));
        const safeFocusX = clamp(focusXPercent, 0, 100) / 100;
        const safeFocusY = clamp(focusYPercent, 0, 100) / 100;
        const targetRatio = targetWidth / targetHeight;

        const img = new Image();
        img.onload = () => {
            const imageWidth = img.width;
            const imageHeight = img.height;
            const imageRatio = imageWidth / imageHeight;

            let cropWidth = imageWidth;
            let cropHeight = imageHeight;
            if (imageRatio > targetRatio) {
                cropWidth = imageHeight * targetRatio;
                cropHeight = imageHeight;
            } else {
                cropWidth = imageWidth;
                cropHeight = imageWidth / targetRatio;
            }

            cropWidth = Math.max(1, cropWidth / safeZoom);
            cropHeight = Math.max(1, cropHeight / safeZoom);

            const centerX = safeFocusX * imageWidth;
            const centerY = safeFocusY * imageHeight;

            const cropX = clamp(centerX - cropWidth / 2, 0, Math.max(0, imageWidth - cropWidth));
            const cropY = clamp(centerY - cropHeight / 2, 0, Math.max(0, imageHeight - cropHeight));

            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(base64);
                return;
            }

            ctx.drawImage(
                img,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                targetWidth,
                targetHeight
            );
            resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

export function cropImageByRect(
    base64: string,
    rect: { x: number; y: number; width: number; height: number },
    options?: { quality?: number; coordinateSpace?: "percent" | "pixel" }
): Promise<string> {
    return new Promise((resolve) => {
        const quality = options?.quality ?? 0.88;
        const coordinateSpace = options?.coordinateSpace ?? "percent";
        const img = new Image();

        img.onload = () => {
            const imgWidth = img.width;
            const imgHeight = img.height;

            const sx = coordinateSpace === "pixel"
                ? clamp(rect.x, 0, imgWidth - 1)
                : clamp((rect.x / 100) * imgWidth, 0, imgWidth - 1);
            const sy = coordinateSpace === "pixel"
                ? clamp(rect.y, 0, imgHeight - 1)
                : clamp((rect.y / 100) * imgHeight, 0, imgHeight - 1);
            const sw = coordinateSpace === "pixel"
                ? clamp(rect.width, 1, imgWidth - sx)
                : clamp((rect.width / 100) * imgWidth, 1, imgWidth - sx);
            const sh = coordinateSpace === "pixel"
                ? clamp(rect.height, 1, imgHeight - sy)
                : clamp((rect.height / 100) * imgHeight, 1, imgHeight - sy);

            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(sw));
            canvas.height = Math.max(1, Math.round(sh));
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(base64);
                return;
            }

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", quality));
        };

        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}
