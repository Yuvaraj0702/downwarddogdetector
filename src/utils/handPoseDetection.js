import * as handpose from '@tensorflow-models/handpose';

export function handPoseDetection() {
    return async (imageData) => {
        try {
            const imageElement = document.createElement('img');
            imageElement.src = imageData;

            // Load the hand pose detection model
            const model = await handpose.load();
            console.log('Model loaded successfully');

            // Detect hand poses in the preprocessed image
            const predictions = await model.estimateHands(imageElement);
            console.log('Predictions:', predictions);


            // Return the detected hand poses
            return predictions;
        } catch (error) {
            console.error('Error detecting hand poses:', error);
            return [];
        }
    };
} export function handPositionEvaluator(buffer) {
    return (landmarks) => {
        // Wrist y-coordinate
        const wristY = landmarks[0][1];

        // Check if the wrist is higher than the majority of other keypoints
        const isWristFlexed = landmarks.slice(1).every((landmark) => wristY < landmark[1] - buffer);

        // Extracting knuckles and finger tips indices
        const knuckleIndices = [1, 5, 9, 13, 17];
        const tipIndices = [4, 8, 12, 16, 20];

        // Check if all knuckles are above (have a smaller y-value than) their corresponding finger tips considering the buffer
        const knucklesHigher = knuckleIndices.every((kIndex, i) => landmarks[kIndex][1] + buffer < landmarks[tipIndices[i]][1]);

        // Check if any finger tip is above (has a smaller y-value than) its corresponding knuckle considering the buffer
        const fingersHigher = tipIndices.some((tIndex, i) => landmarks[tIndex][1] < landmarks[knuckleIndices[i]][1] + buffer);

        // Combining the checks for a comprehensive message
        const wristStatus = isWristFlexed ? "Wrist Flexed" : "Wrist Not Flexed";
        if (knucklesHigher) {
            return `${wristStatus}, Ideal position`;
        } else if (fingersHigher) {
            return `${wristStatus}, Claw grip`;
        }
        return `${wristStatus}, Normal position`;
    };
}

