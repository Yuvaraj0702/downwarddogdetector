import { detectPose } from './movenetUtils';
import { preprocessImage } from './preprocessImage';

export function dropHandler(readFileAsDataURL, setImage, setIsLoading, setPose, detectObjects, setObjects, detectHandPoses, setHandPoses) {
    return async (acceptedFiles) => {
        const file = acceptedFiles[0];
        const imageData = await readFileAsDataURL(file);
        setImage(imageData);
        setIsLoading(true); // Set loading state to true

        const preprocessedImageData = await preprocessImage(imageData);

        const pose = await detectPose(preprocessedImageData);
        setPose(pose);

        const objects = await detectObjects(imageData);
        setObjects(objects);

        const handPoses = await detectHandPoses(imageData); // Detect hand poses
        setHandPoses(handPoses); // Set hand poses state

        setIsLoading(false);
    };
}
export function fileReader() {
    return (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        reader.readAsDataURL(file);
    });
}
