export interface BackgroundLayout { x: number; y: number; width: number; height: number }

export const backgroundLayout = (
  imageWidth: number, imageHeight: number, viewWidth: number, viewHeight: number, cameraX: number, cameraY: number,
): BackgroundLayout => {
  const scale = Math.max(viewWidth / imageWidth, viewHeight / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  // The landscape contains one sun and has no seamless edges. Never repeat it.
  return {
    x: Math.min(0, Math.max(viewWidth - width, -cameraX / 8)),
    y: Math.min(0, Math.max(viewHeight - height, -cameraY / 8)),
    width, height,
  };
};
