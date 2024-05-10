// TransferLearningApp.js

import React, { useEffect, useRef } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';

function TransferLearningApp() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        const runCoco = async () => {
            const net = await cocoSsd.load();
            console.log('COCO-SSD model loaded.');

            // Load a pre-trained MobileNet model to use for feature extraction
            const mobilenet = await tf.loadLayersModel('https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/feature_vector/4');

            // Replace the top layers of MobileNet with new layers for transfer learning
            const layer = mobilenet.getLayer('global_average_pooling2d');

            // Add a dense layer with a softmax activation function
            const newLayer = tf.layers.dense({
                units: 90,
                activation: 'softmax'
            });

            // Create a sequential model and add the layers
            const newModel = tf.sequential();
            newModel.add(mobilenet);
            newModel.add(newLayer);

            // Compile the model
            newModel.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            // Get access to the webcam stream
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoRef.current.srcObject = stream;

                // Start detecting objects in the video stream
                setInterval(async () => {
                    const predictions = await net.detect(videoRef.current);
                    console.log(predictions);

                    // Draw bounding boxes on the canvas
                    const ctx = canvasRef.current.getContext('2d');
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    predictions.forEach(prediction => {
                        ctx.beginPath();
                        ctx.rect(prediction.bbox[0], prediction.bbox[1], prediction.bbox[2], prediction.bbox[3]);
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'red';
                        ctx.fillStyle = 'red';
                        ctx.stroke();
                        ctx.fillText(`${prediction.class} (${prediction.score.toFixed(2)})`, prediction.bbox[0], prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10);
                    });
                }, 100);
            }
        };

        runCoco();
    }, []);

    return (
        <div>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                width="720"
                height="600"
            />
            <canvas
                ref={canvasRef}
                width="720"
                height="600"
            />
        </div>
    );
}

export default TransferLearningApp;
