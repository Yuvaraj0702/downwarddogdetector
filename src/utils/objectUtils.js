import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/coco-ssd'; // Change import to load the COCO-SSD model

export async function detectObjects(imageData) {
  await tf.ready(); 
  const imageElement = document.createElement('img');
  imageElement.src = imageData;
  await tf.nextFrame();

  const model = await load(); // Load the COCO-SSD model
  
  // Detect objects in the image
  const predictions = await model.detect(imageElement);

  return predictions;
}
