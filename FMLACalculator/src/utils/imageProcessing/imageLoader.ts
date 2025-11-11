export async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export function validateImageFile(file: File): void {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload a valid image file (PNG, JPEG, or JPG)');
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('Image file is too large. Maximum size is 10MB');
  }
}