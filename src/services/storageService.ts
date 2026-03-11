import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebaseConfig';

/**
 * Cloud Storage service for clothing images.
 * Images are stored at: wardrobe/{uid}/{itemId}.jpg
 */
export const storageService = {
    /**
     * Upload a base64 image to Cloud Storage.
     * Returns the permanent download URL.
     */
    async uploadClothingImage(uid: string, itemId: string, base64Data: string): Promise<string> {
        const storageRef = ref(storage, `wardrobe/${uid}/${itemId}.jpg`);

        // base64Data may include the data URL prefix — strip it for upload
        const base64Content = base64Data.includes(',')
            ? base64Data.split(',')[1]
            : base64Data;

        const contentType = base64Data.startsWith('data:image/png')
            ? 'image/png'
            : 'image/jpeg';

        await uploadString(storageRef, base64Content, 'base64', {
            contentType,
        });

        return getDownloadURL(storageRef);
    },

    /**
     * Delete a clothing image from Cloud Storage.
     */
    async deleteClothingImage(uid: string, itemId: string): Promise<void> {
        const storageRef = ref(storage, `wardrobe/${uid}/${itemId}.jpg`);
        try {
            await deleteObject(storageRef);
        } catch (err: any) {
            // Ignore "object-not-found" — item may not have an uploaded image (e.g., demo data)
            if (err.code !== 'storage/object-not-found') {
                throw err;
            }
        }
    },
};
