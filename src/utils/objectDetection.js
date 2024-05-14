import * as mobilenet from '@tensorflow-models/mobilenet';

export function objectDetection() {
    return async (imageData) => {
        try {
            const imageElement = document.createElement('img');
            imageElement.src = imageData;

            const model = await mobilenet.load();
            console.log('Model loaded successfully');

            const predictions = await model.classify(imageElement);
            console.log('Predictions:', predictions);

            return predictions;
        } catch (error) {
            console.error('Error detecting objects:', error);
            return [];
        }
    };
}
