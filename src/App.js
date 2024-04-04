// App.js
import React, { useState } from 'react';
import { detectPose } from './utils/movenetUtils';
import Dropzone from 'react-dropzone';

function App() {
  const [image, setImage] = useState(null);
  const [pose, setPose] = useState(null);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    const imageData = await readFileAsDataURL(file);
    setImage(imageData);

    const pose = await detectPose(imageData);
    setPose(pose);
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

  const renderPoseFeedback = (pose) => {
    const feedback = [];

    if (isHipAboveFoot(pose)) {
      feedback.push(
        <li key="hipAboveFoot" style={positiveFeedbackStyle}>
          Hips are above feet. Good job!
        </li>
      );
    } else {
      feedback.push(
        <li key="hipAboveFoot" style={negativeFeedbackStyle}>
          Please raise your hips above feet level.
        </li>
      );
    }

    if (isHeadBelowHip(pose)) {
      feedback.push(
        <li key="headBelowHip" style={positiveFeedbackStyle}>
          Head is below hip level. You're doing a good job.
        </li>
      );
    } else {
      feedback.push(
        <li key="headBelowHip" style={negativeFeedbackStyle}>
          Place your palms on the floor and bend forward.
        </li>
      );
    }

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
          Downward dog position completed successfully.
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

  const isHipAboveFoot = (pose) => {
    const hip = pose.keypoints.find(keypoint => keypoint.name === 'left_hip' || keypoint.name === 'right_hip');
    const foot = pose.keypoints.find(keypoint => keypoint.name === 'left_ankle' || keypoint.name === 'right_ankle');

    return hip && foot && hip.y < foot.y;
  };

  const isHeadBelowHip = (pose) => {
    const head = pose.keypoints.find(keypoint => keypoint.name === 'nose' || keypoint.name === 'left_eye' || keypoint.name === 'right_eye');
    const hip = pose.keypoints.find(keypoint => keypoint.name === 'left_hip' || keypoint.name === 'right_hip');

    return !(head && hip && head.y < hip.y);
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
      <h1 style={headerStyle}>Downward Dog Detection</h1>
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
      {pose && (
        <div style={poseResultContainerStyle}>
          <h2 style={poseResultTitleStyle}>Pose Detection Results</h2>
          {parsePose(pose)}
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  fontFamily: 'Arial, sans-serif',
  textAlign: 'center',
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
