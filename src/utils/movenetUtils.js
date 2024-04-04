// movenetUtils.js
import * as tf from '@tensorflow/tfjs';
import { createDetector, moveNet } from '@tensorflow-models/pose-detection';

export async function detectPose(imageData) {
await tf.ready(); 
  const imageElement = document.createElement('img');
  imageElement.src = imageData;
  await tf.nextFrame();

  const detector = await createDetector("MoveNet");
  const predictions = await detector.estimatePoses(imageElement);

  return predictions;
}
