export const preprocessImage = async (imageData) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas dimensions to image dimensions
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image onto canvas
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Convert image to grayscale for better edge detection
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;
                data[i + 1] = avg;
                data[i + 2] = avg;
            }
            ctx.putImageData(imageData, 0, 0);

            // Apply edge detection algorithm
            const edgeImageData = applyEdgeDetection(canvas);

            // Apply dilation to thicken detected edges
            const dilatedImageData = applyDilation(edgeImageData);

            // Convert the preprocessed image data to base64
            const preprocessedImageData = dilatedImageData.toDataURL('image/jpeg');

            resolve(preprocessedImageData);
        };
        img.onerror = (error) => {
            reject(error);
        };
        img.src = imageData;
    });
};
// Apply edge detection
function applyEdgeDetection(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}
// Apply dilation to thicken detected edges
function applyDilation(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const tempData = new Uint8ClampedArray(data);
    const width = canvas.width;
    const height = canvas.height;
    const kernel = [
        [0, 1, 0],
        [1, 1, 1],
        [0, 1, 0]
    ]; // Dilation kernel
    const kernelSize = 3;
    const halfKernelSize = Math.floor(kernelSize / 2);

    for (let y = halfKernelSize; y < height - halfKernelSize; y++) {
        for (let x = halfKernelSize; x < width - halfKernelSize; x++) {
            let max = 0;
            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const kyIndex = y + ky - halfKernelSize;
                    const kxIndex = x + kx - halfKernelSize;
                    const kernelValue = kernel[ky][kx];
                    const pixelValue = tempData[(kyIndex * width + kxIndex) * 4];
                    max = Math.max(max, kernelValue * pixelValue);
                }
            }
            const index = (y * width + x) * 4;
            data[index] = max;
            data[index + 1] = max;
            data[index + 2] = max;
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}
