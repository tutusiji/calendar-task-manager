import Compressor from 'compressorjs';

/**
 * 压缩图片并裁剪为 256x256 的正方形（居中裁剪）
 * @param file 原始文件
 * @returns Promise<string> Base64 字符串
 */
export const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. 第一步：使用 Compressor.js 修复方向 (EXIF Orientation) 并转为 JPG
    // 我们先不压缩大小，只处理方向和格式，确保后续 Canvas 处理时方向正确
    new Compressor(file, {
      checkOrientation: true,
      mimeType: 'image/jpeg',
      quality: 0.9, // 中间过程保持较高质量
      maxWidth: Infinity,
      maxHeight: Infinity,
      success(resultBlob) {
        // 2. 第二步：使用 Canvas 进行居中裁剪和最终压缩
        const img = new Image();
        const url = URL.createObjectURL(resultBlob);
        
        img.onload = () => {
          URL.revokeObjectURL(url);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to create canvas context'));
            return;
          }

          // 目标尺寸
          const targetSize = 256;
          canvas.width = targetSize;
          canvas.height = targetSize;

          // 计算裁剪参数 (Center Crop)
          // 类似于 object-fit: cover
          let sourceX = 0;
          let sourceY = 0;
          let sourceWidth = img.width;
          let sourceHeight = img.height;
          
          const aspectRatio = img.width / img.height;
          
          // 如果是宽图 (宽高比 > 1)
          if (aspectRatio > 1) {
            sourceWidth = img.height; // 截取正方形，宽度等于高度
            sourceX = (img.width - img.height) / 2; // 居中
          } 
          // 如果是长图 (宽高比 < 1)
          else if (aspectRatio < 1) {
            sourceHeight = img.width; // 截取正方形，高度等于宽度
            sourceY = (img.height - img.width) / 2; // 居中
          }
          // 如果是正方形，不需要改变 sourceX/Y/Width/Height

          // 绘制图片：从源图像的 (sourceX, sourceY) 处截取 sourceWidth * sourceHeight 的区域
          // 缩放到目标画布的 0, 0, targetSize, targetSize
          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            targetSize,
            targetSize
          );

          // 3. 第三步：导出为 Base64，最终压缩质量 0.6
          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          resolve(base64);
        };

        img.onerror = (err) => {
          URL.revokeObjectURL(url);
          reject(err);
        };

        img.src = url;
      },
      error(err) {
        reject(err);
      },
    });
  });
};
