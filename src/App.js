// App.js
import React, { useState } from 'react';
import { detectPose } from './utils/movenetUtils';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Dropzone from 'react-dropzone';
import { FaSpinner } from 'react-icons/fa';

const preprocessImage = async (imageData) => {
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



function App() {
  const [image, setImage] = useState(null);
  const [pose, setPose] = useState(null);
  const [objects, setObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    const imageData = await readFileAsDataURL(file);
    setImage(imageData);
    setIsLoading(true); // Set loading state to true

    const preprocessedImageData = await preprocessImage(imageData);

    const pose = await detectPose(preprocessedImageData);
    setPose(pose);

    const objects = await detectObjects(imageData);
    setObjects(objects);

    setIsLoading(false);
  };

  const detectObjects = async (imageData) => {
    const imageElement = document.createElement('img');
    imageElement.src = imageData;

    const model = await cocoSsd.load();
    const predictions = await model.detect(imageElement);

    return predictions;
  };

  const readFileAsDataURL = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      reader.readAsDataURL(file);
    });

  const parsePose = (poseData) => {
    if (!poseData || poseData.length === 0) {
      return 'No pose detected.';
    }

    return poseData.map((pose, index) => (
      <div key={index} style={poseContainerStyle}>
        <ul>
          {renderPoseFeedback(pose)}
          {pose.keypoints.map((keypoint, keypointIndex) => (
            <li key={keypointIndex}>
              {keypoint.name}:{keypoint.score.toFixed(2) > 0.2 ? "in frame" : "not in frame or not visible"}

            </li>
          ))}
        </ul>
      </div>
    ));
  };

  const isPersonFacingLeft = (pose) => {
    const leftShoulder = pose.keypoints.find(keypoint => keypoint.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(keypoint => keypoint.name === 'right_shoulder');
    const leftHip = pose.keypoints.find(keypoint => keypoint.name === 'left_hip');
    const rightHip = pose.keypoints.find(keypoint => keypoint.name === 'right_hip');

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return false; // One or more keypoints not found
    }

    // Calculate the angle between the line connecting the shoulders and the line connecting the hips
    const deltaYShoulders = rightShoulder.y - leftShoulder.y;
    const deltaXShoulders = rightShoulder.x - leftShoulder.x;
    const shoulderAngle = Math.atan2(deltaYShoulders, deltaXShoulders) * (180 / Math.PI);

    const deltaYHips = rightHip.y - leftHip.y;
    const deltaXHips = rightHip.x - leftHip.x;
    const hipAngle = Math.atan2(deltaYHips, deltaXHips) * (180 / Math.PI);

    // If the shoulders are more elevated than the hips, the person is facing left
    return shoulderAngle > hipAngle;
  };


  const calculateAngle = (point1, point2, point3) => {
    const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) - Math.atan2(point1.y - point2.y, point1.x - point2.x);
    let angle = radians * (180 / Math.PI);
    angle = Math.abs(angle);
    return angle > 180 ? 360 - angle : angle;
  };

  // Add a function to check if shoulder-hip-knee angle is approximately 90 degrees
  const isShoulderHipKneeAngleRight = (pose) => {
    const leftShoulder = pose.keypoints.find(keypoint => keypoint.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(keypoint => keypoint.name === 'right_shoulder');
    const leftHip = pose.keypoints.find(keypoint => keypoint.name === 'left_hip');
    const rightHip = pose.keypoints.find(keypoint => keypoint.name === 'right_hip');
    const leftKnee = pose.keypoints.find(keypoint => keypoint.name === 'left_knee');
    const rightKnee = pose.keypoints.find(keypoint => keypoint.name === 'right_knee');

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !leftKnee || !rightKnee) {
      return 0; // One or more keypoints not found
    }

    const shoulderHipKneeAngleLeft = calculateAngle(leftShoulder, leftHip, leftKnee);
    const shoulderHipKneeAngleRight = calculateAngle(rightShoulder, rightHip, rightKnee);

    // Depending on which side the person is facing, use the appropriate angle for comparison
    if (isPersonFacingLeft(pose)) {
      return shoulderHipKneeAngleLeft;
    } else {
      return shoulderHipKneeAngleRight;
    }
  };

  const isHipKneeFootAngleRight = (pose) => {
    const leftHip = pose.keypoints.find(keypoint => keypoint.name === 'left_hip');
    const rightHip = pose.keypoints.find(keypoint => keypoint.name === 'right_hip');
    const leftKnee = pose.keypoints.find(keypoint => keypoint.name === 'left_knee');
    const rightKnee = pose.keypoints.find(keypoint => keypoint.name === 'right_knee');
    const leftAnkle = pose.keypoints.find(keypoint => keypoint.name === 'left_ankle');
    const rightAnkle = pose.keypoints.find(keypoint => keypoint.name === 'right_ankle');

    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return false; // One or more keypoints not found
    }

    // Depending on which side the person is facing, use the appropriate angle for comparison
    if (isPersonFacingLeft(pose)) {
      return calculateAngle(leftHip, leftKnee, leftAnkle);;
    } else {
      return calculateAngle(rightHip, rightKnee, rightAnkle);
    }
  };

  const calculateNeckPoint = (pose) => {
    const leftEar = pose.keypoints.find(keypoint => keypoint.name === 'left_ear');
    const rightEar = pose.keypoints.find(keypoint => keypoint.name === 'right_ear');
    const leftShoulder = pose.keypoints.find(keypoint => keypoint.name === 'left_shoulder');
    const rightShoulder = pose.keypoints.find(keypoint => keypoint.name === 'right_shoulder');

    if (!leftEar || !rightEar || !leftShoulder || !rightShoulder) {
      return null; // Return null if any of the required keypoints are missing
    }

    let neckX, neckY;

    // Check if the person is facing left or right
    if (leftEar.x < rightEar.x) {
      // Person is facing right
      neckX = (leftEar.x + leftShoulder.x) / 2;
      neckY = (leftEar.y + leftShoulder.y) / 2;
    } else {
      // Person is facing left
      neckX = (rightEar.x + rightShoulder.x) / 2;
      neckY = (rightEar.y + rightShoulder.y) / 2;
    }

    return { x: neckX, y: neckY };
  };


  const isNeckTiltAngleApprox90Degrees = (pose) => {
    const nose = pose.keypoints.find(keypoint => keypoint.name === 'nose');
    const neckPoint = calculateNeckPoint(pose); // Using the calculated neck point

    if (!nose || !neckPoint) {
      return 0; // One or both keypoints not found
    }

    // Calculate the angle between the line connecting the nose and the neck point and the vertical axis
    const deltaY = nose.y - neckPoint.y; // Reversed order to get angle relative to vertical axis
    const deltaX = neckPoint.x - nose.x; // No change in order
    let angleRadians = Math.atan2(deltaY, deltaX);
    let angleDegrees = angleRadians * (180 / Math.PI);

    // Normalize angle to be between 0 and 180 degrees
    angleDegrees = (angleDegrees + 180) % 180;

    // Adjust angle if facing right side
    if (rightFacing(pose)) {
      angleDegrees = 180 - angleDegrees;
    }

    return angleDegrees; // Return the actual angle
  };

  const rightFacing = (pose) => {
    const leftEar = pose.keypoints.find(keypoint => keypoint.name === 'left_ear');
    const rightEar = pose.keypoints.find(keypoint => keypoint.name === 'right_ear');
    const leftKnee = pose.keypoints.find(keypoint => keypoint.name === 'left_knee');
    const rightKnee = pose.keypoints.find(keypoint => keypoint.name === 'right_knee');

    if (!leftEar || !rightEar || !leftKnee || !rightKnee) {
      return false; // Unable to determine facing direction if any required keypoints are missing
    }

    return rightEar.x > rightKnee.x && leftEar.x > leftKnee.x;
  };

  const calculateShoulderElbowWristAngle = (pose) => {
    let shoulder, elbow, wrist;
    if (rightFacing(pose)) {
      shoulder = pose.keypoints.find(keypoint => keypoint.name === 'right_shoulder');
      elbow = pose.keypoints.find(keypoint => keypoint.name === 'right_elbow');
      wrist = pose.keypoints.find(keypoint => keypoint.name === 'right_wrist');
    } else {
      shoulder = pose.keypoints.find(keypoint => keypoint.name === 'left_shoulder');
      elbow = pose.keypoints.find(keypoint => keypoint.name === 'left_elbow');
      wrist = pose.keypoints.find(keypoint => keypoint.name === 'left_wrist');
    }

    if (!shoulder || !elbow || !wrist) {
      return 0; // One or more keypoints not found
    }

    // Calculate angle between shoulder, elbow, and wrist
    const angle = calculateAngle(shoulder, elbow, wrist);

    return angle;
  };
  const isLegsNotCrossed = (pose) => {
    const leftAnkle = pose.keypoints.find(keypoint => keypoint.name === 'left_ankle');
    const rightAnkle = pose.keypoints.find(keypoint => keypoint.name === 'right_ankle');

    if (!leftAnkle || !rightAnkle) {
      return 0; // Unable to determine leg positions if ankle keypoints are missing
    }

    // Calculate the difference in Y coordinates between the ankles
    const deltaY = Math.abs(leftAnkle.y - rightAnkle.y);

    // If the difference is above a certain threshold, legs are considered crossed
    return deltaY;
  };

  const renderPoseFeedback = (pose) => {
    const feedback = [];

    pose.keypoints.forEach((keypoint, index) => {
      if (keypoint.score < 0.2) {
        feedback.push(
          <tr key={`keypoint-${index}`}>
            <td>{`${keypoint.name} Confidence`}</td>
            <td style={{ color: 'red' }}>Low confidence </td>
            <td>Corresponding point is not fully visible</td>
          </tr>
        );
      }
    });

    feedback.push(
      <tr key="neckAlignment">
        <td>Head tilt check</td>
        <td>
          {isNeckTiltAngleApprox90Degrees(pose) > 50
            ? "Downwards tilt"
            : isNeckTiltAngleApprox90Degrees(pose) < 10
              ? "Upwards tilt"
              : "Neutral"}
        </td>
        <td>
          {/* Add comment about confidence level if below 0.2 */}
          {pose.keypoints.some(keypoint => keypoint.name === 'nose' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'left_ear' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_ear' && keypoint.score < 0.2)
            ? "Some keypoints not fully visible but estimated angle is " + isNeckTiltAngleApprox90Degrees(pose).toFixed(2)
            : "Current neck angle is " + isNeckTiltAngleApprox90Degrees(pose).toFixed(2)}
        </td>
      </tr>
    );

    feedback.push(
      <tr key="legs crossed">
        <td>Legs crossed check</td>
        <td>{isLegsNotCrossed(pose) < 10 ? "No crossing of legs" : "Legs crossed"}</td>
        <td>
          {/* Add comment about confidence level if below 0.2 */}
          {pose.keypoints.some(keypoint => keypoint.name === 'left_ankle' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_ankle' && keypoint.score < 0.2)
            ? "Some keypoints not fully visible but estimated distance is " + isLegsNotCrossed(pose).toFixed(2)
            : "Current vertical leg distance is " + isLegsNotCrossed(pose).toFixed(2)}
        </td>
      </tr>
    );

    feedback.push(
      <tr key="shoulderHipKneeAlignment">
        <td>Body lean check</td>
        <td>
          {isShoulderHipKneeAngleRight(pose) < 70
            ? "Leaning forward"
            : isShoulderHipKneeAngleRight(pose) > 110
              ? "Leaning back"
              : "Correct posture"}
        </td>
        <td>
          {/* Add comment about confidence level if below 0.2 */}
          {pose.keypoints.some(keypoint => keypoint.name === 'left_shoulder' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_shoulder' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'left_hip' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_hip' && keypoint.score < 0.2)
            ? "Some keypoints not fully visible based on estimation angle is " + isShoulderHipKneeAngleRight(pose).toFixed(2)
            : "Current shoulder hip knee angle is " + isShoulderHipKneeAngleRight(pose).toFixed(2)}
        </td>
      </tr>
    );

    feedback.push(
      <tr key="hipKneeFootAlignment">
        <td>Chair height check</td>
        <td>
          {isHipKneeFootAngleRight(pose) < 70
            ? "Chair too low"
            : isHipKneeFootAngleRight(pose) > 110
              ? "Chair too high"
              : "Correct chair height"}
        </td>
        <td>
          {/* Add comment about confidence level if below 0.2 */}
          {pose.keypoints.some(keypoint => keypoint.name === 'left_hip' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_hip' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'left_knee' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_knee' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'left_ankle' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_ankle' && keypoint.score < 0.2)
            ? "Some keypoints not fully visible based on estimation angle is " + isHipKneeFootAngleRight(pose).toFixed(2)
            : "Current hip knee foot angle is " + isHipKneeFootAngleRight(pose).toFixed(2)}
        </td>
      </tr>
    );

    feedback.push(
      <tr key="shoulderElbowWristAlignment">
        <td>Table distancing check</td>
        <td>
          {calculateShoulderElbowWristAngle(pose) < 90
            ? "Table too close to body"
            : calculateShoulderElbowWristAngle(pose) > 120
              ? "Table too far from body"
              : "Correct table distance"}
        </td>
        <td>
          {/* Add comment about confidence level if below 0.2 */}
          {pose.keypoints.some(keypoint => keypoint.name === 'left_shoulder' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_shoulder' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'left_elbow' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_elbow' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'left_wrist' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_wrist' && keypoint.score < 0.2)
            ? "Some keypoints not fully visible but shoulder elbow wrist angle is " + calculateShoulderElbowWristAngle(pose).toFixed(2)
            : "Shoulder elbow wrist angle is " + calculateShoulderElbowWristAngle(pose).toFixed(2)}
        </td>
      </tr>
    );

    if (areFeetPlanted(pose)) {
      feedback.push(
        <tr key="feetPlanted">
          <td>Feet are planted on the ground. You've got a good base.</td>
          <td>OK</td>
          <td>-</td>
        </tr>
      );
    } else {
      feedback.push(
        <tr key="feetPlanted">
          <td>Please ensure that your feet are on the ground and ensure that your legs are straight.</td>
          <td>Not OK</td>
          <td>-</td>
        </tr>
      );
    }

    // Check if all feedback items are positive or negative
    const isPositiveFeedback = feedback.every(item => item.props.style && item.props.style.color === 'green');

    if (isPositiveFeedback) {
      feedback.push(
        <tr key="poseCompleted">
          <td>Seated posture is good.</td>
          <td>OK</td>
          <td>-</td>
        </tr>
      );
    } else {
      feedback.push(
        <tr key="poseNotCompleted">
          <td>Please look at the feedback above and try to correct your posture.</td>
          <td>Not OK</td>
          <td>-</td>
        </tr>
      );
    }

    return (
      <div style={tableContainerStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Focus area</th>
              <th style={thStyle}>Result</th>
              <th style={thStyle}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {feedback}
          </tbody>
        </table>
      </div>
    );
  };




  const areFeetPlanted = (pose) => {
    const leftFoot = pose.keypoints.find(keypoint => keypoint.name === 'left_ankle');
    const rightFoot = pose.keypoints.find(keypoint => keypoint.name === 'right_ankle');
    const leftHip = pose.keypoints.find(keypoint => keypoint.name === 'left_hip');
    const rightHip = pose.keypoints.find(keypoint => keypoint.name === 'right_hip');
    const leftKnee = pose.keypoints.find(keypoint => keypoint.name === 'left_knee');
    const rightKnee = pose.keypoints.find(keypoint => keypoint.name === 'right_knee');

    return leftFoot && rightFoot && leftHip && rightHip && leftKnee && rightKnee &&
      leftFoot.y > leftHip.y && rightFoot.y > rightHip.y &&
      leftFoot.y > leftKnee.y && rightFoot.y > rightKnee.y &&
      Math.abs(leftFoot.y - rightFoot.y) < 30;
  };

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Posture and Object Detection</h1>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Dropzone onDrop={onDrop} accept="image/*">
          {({ getRootProps, getInputProps }) => (
            <section>
              <div {...getRootProps()} style={dropzoneStyle}>
                <input {...getInputProps()} />
                <p style={dropzoneTextStyle}>Drag 'n' drop an image here, or click to select one</p>
              </div>
            </section>
          )}
        </Dropzone>
        {image && (
          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={imageContainerStyle}>
              <h2 style={uploadedImageTitleStyle}>Uploaded Image</h2>
              <img src={image} alt="Uploaded" style={imageStyle} />
            </div>
            <div style={poseResultContainerStyle}>
              {isLoading ? (
                <div style={{ textAlign: 'center' }}>
                  <FaSpinner className="spinner" />
                </div>
              ) : (
                <>
                  {pose && parsePose(pose)}
                  {objects && (
                    <div>
                      <h2>Detected Objects</h2>
                      <ul>
                        {objects.map((object, index) => (
                          <li key={index}>{object.class}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle = {
  fontFamily: 'Arial, sans-serif',
  textAlign: 'left',
  padding: '20px',
  backgroundColor: '#f5f5f5', // Light background color
};

const headerStyle = {
  fontSize: '2rem',
  fontWeight: 'bold',
  marginBottom: '30px',
};

const dropzoneStyle = {
  border: '2px dashed #ccc',
  borderRadius: '5px',
  padding: '20px',
  cursor: 'pointer',
  backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white background
};

const dropzoneTextStyle = {
  fontSize: '1rem',
  color: '#555',
};

const imageContainerStyle = {
  marginTop: '30px',
};

const uploadedImageTitleStyle = {
  fontSize: '1.5rem',
};

const imageStyle = {
  maxWidth: '100%',
  maxHeight: '400px',
  marginTop: '10px',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.2)', // Add a slight shadow to the image
};

const poseResultContainerStyle = {
  marginTop: '30px',
};


const poseContainerStyle = {
  marginBottom: '20px',
};


const tableContainerStyle = {
  backgroundColor: 'white',
  border: '1px solid #ccc',
  borderRadius: '10px', // Rounded border
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
  padding: '20px',
  margin: '20px auto', // Centered horizontally
};

const tableStyle = {
  borderCollapse: 'separate', // Separate borders
  borderSpacing: '0px', // Remove extra space between cells
  width: '100%',
  borderRadius: '10px', // Rounded border
};

const thStyle = {
  backgroundColor: '#f2f2f2',
  border: '1px solid #ccc', // Grey border
  padding: '8px',
  textAlign: 'left',
  fontWeight: 'bold',
};



export default App;
