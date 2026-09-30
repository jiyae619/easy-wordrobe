export const storageService = {
    async uploadClothingImage(_uid: string, _itemId: string, base64Data: string): Promise<string> {
        return base64Data; // keep the data URL in memory (no Cloud Storage in demo)
    },
    async deleteClothingImage(): Promise<void> { },
};
