// App.js
import React, { useState } from 'react';
import { detectPose } from './utils/movenetUtils';
import Dropzone from 'react-dropzone';
import { FaSpinner } from 'react-icons/fa';

function App() {
  const [image, setImage] = useState(null);
  const [pose, setPose] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    const imageData = await readFileAsDataURL(file);
    setImage(imageData);
    setIsLoading(true); // Set loading state to true

    const pose = await detectPose(imageData);
    setPose(pose);
    setIsLoading(false); // Set loading state to false after model processing
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
        <h3 style={poseTitleStyle}>Pose {index + 1}</h3>
        <ul>
          {renderPoseFeedback(pose)}
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
  
  const isPersonFacingRight = (pose) => !isPersonFacingLeft(pose);
  

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
  
  
  

  const renderPoseFeedback = (pose) => {
    const feedback = [];


      feedback.push(
        <li key="neckAlignment" style={positiveFeedbackStyle}>
         head tilt is {isNeckTiltAngleApprox90Degrees(pose).toFixed(2)} ideal is 30 degrees
        </li>
      );

      feedback.push(
        <li key="shoulderHipKneeAlignment" style={positiveFeedbackStyle}>
          shoulder hip knee angle is {isShoulderHipKneeAngleRight(pose).toFixed(2)} ideal is 90 degrees
        </li>
      );
      
      feedback.push(
        <li key="hipKneeFootAlignment" style={positiveFeedbackStyle}>
          hip knee foot angle is {isHipKneeFootAngleRight(pose).toFixed(2)} ideal is 90 degrees
        </li>
      );

      feedback.push(
        <li key="shoulderElbowWristAlignment" style={positiveFeedbackStyle}>
          Shoulder Elbow wrist angle is {calculateShoulderElbowWristAngle(pose).toFixed(2)} ideal is 110 degrees
        </li>
      );

    if (areFeetPlanted(pose)) {
      feedback.push(
        <li key="feetPlanted" style={positiveFeedbackStyle}>
          Feet are planted on the ground. You've got a good base.
        </li>
      );
    } else {
      feedback.push(
        <li key="feetPlanted" style={negativeFeedbackStyle}>
          Please ensure that your feet are on the ground and ensure that your legs are straight.
        </li>
      );
    }

    if (feedback.every(item => item.props.style.color === 'green')) {
      feedback.push(
        <li key="poseCompleted" style={positiveFeedbackStyle}>
          Seated posture is good.
        </li>
      );
    } else {
      feedback.push(
        <li key="poseNotCompleted" style={negativeFeedbackStyle}>
          Please look at the feedback above and try to correct your posture.
        </li>
      );
    }

    return feedback;
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
      <h1 style={headerStyle}>Posture Detection</h1>
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
        <div style={imageContainerStyle}>
          <h2 style={uploadedImageTitleStyle}>Uploaded Image</h2>
          <img src={image} alt="Uploaded" style={imageStyle} />
        </div>
      )}
      <div style={poseResultContainerStyle}>
        {isLoading ? ( // Display spinner if isLoading is true
          <div style={{ textAlign: 'center' }}>
            <FaSpinner className="spinner" />
          </div>
        ) : (
          <>
            <h2 style={poseResultTitleStyle}>Pose Detection Results</h2>
            {pose && parsePose(pose)} {/* Render pose if it's available */}
          </>
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

const poseResultTitleStyle = {
  fontSize: '1.5rem',
  marginBottom: '20px',
};

const poseContainerStyle = {
  marginBottom: '20px',
};

const poseTitleStyle = {
  fontSize: '1.2rem',
  marginBottom: '10px',
};

const positiveFeedbackStyle = {
  fontWeight: 'bold',
  color: 'green',
};

const negativeFeedbackStyle = {
  fontWeight: 'bold',
  color: 'red',
};

export default App;
