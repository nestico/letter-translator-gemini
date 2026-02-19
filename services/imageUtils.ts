/**
 * Utility for client-side image compression using Canvas API.
 * Resizes images to a reasonable maximum dimension and reduces JPEG quality.
 */
export const compressImage = async (file: File, maxWidth = 1920, maxHeight = 1080, quality = 0.8): Promise<File> => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Skip compression for small files (< 300KB)
    if (file.size < 300 * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions (maintain aspect ratio)
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw image with smooth scaling
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to Blob
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob from canvas'));
                            return;
                        }
                        // Create a new File object from the blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Failed to load image for compression'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
    });
};
