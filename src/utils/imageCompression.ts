export interface CompressImageOptions {
  maxDimension: number;
  maxDataUrlLength: number;
  initialQuality?: number;
  minQuality?: number;
}

export async function compressImageFileToDataUrl(
  file: File,
  options: CompressImageOptions
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name || 'Tệp'}" không phải hình ảnh hợp lệ (PNG, JPG, WebP).`);
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể tải ảnh để xử lý.'));
    image.src = rawDataUrl;
  });

  const scale = Math.min(1, options.maxDimension / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  let quality = options.initialQuality ?? 0.85;
  const minQuality = options.minQuality ?? 0.4;
  let result = canvas.toDataURL('image/jpeg', quality);

  while (result.length > options.maxDataUrlLength && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.12);
    result = canvas.toDataURL('image/jpeg', quality);
    if (quality === minQuality) break;
  }

  if (result.length > options.maxDataUrlLength * 1.15) {
    throw new Error('Ảnh sau khi nén vẫn vượt giới hạn cho phép. Vui lòng chọn ảnh nhẹ hơn.');
  }

  return result;
}
