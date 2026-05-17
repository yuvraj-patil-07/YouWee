export async function getAverageColor(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve('#00d4ff'); return; }

      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      
      // Convert to hex
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      
      // Ensure it's not too dark or too light for UI consistency
      // For this app, we want vibrant colors but not white/black
      resolve(hex);
    };
    img.onerror = () => resolve('#00d4ff');
  });
}
