// App.js
import React, { useState } from 'react';
import Dropzone from 'react-dropzone';
import { FaSpinner } from 'react-icons/fa';
import { objectDetection } from './utils/objectDetection';
import { handPoseDetection } from './utils/handPoseDetection';
import { leftFacingCheck, angleCalculator, shoulderHipKneeCalculator, hipKneeFootCalculator, neckPointCalculator, rightFacingCheck, neckTiltCalculator, shoulderElbowWristCalculator, legCrossCheck } from './utils/calculationUtils';
import { feetPlantedCheck } from './utils/calculationUtils';
import { fileReader, dropHandler } from './utils/fileReader';
import { handPositionEvaluator } from './utils/handPoseDetection';

function App() {
  const [image, setImage] = useState(null);
  const [pose, setPose] = useState(null);
  const [handPoses, setHandPoses] = useState(null);
  const [objects, setObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  const detectObjects = objectDetection();
  const detectHandPoses = handPoseDetection();

  const readFileAsDataURL = fileReader();
  const onDrop = dropHandler(readFileAsDataURL, setImage, setIsLoading, setPose, detectObjects, setObjects, detectHandPoses, setHandPoses);

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

  const isPersonFacingLeft = leftFacingCheck();

  const calculateAngle = angleCalculator();

  const isShoulderHipKneeAngleRight = shoulderHipKneeCalculator(calculateAngle, isPersonFacingLeft);

  const isHipKneeFootAngleRight = hipKneeFootCalculator(isPersonFacingLeft, calculateAngle);

  const calculateNeckPoint = neckPointCalculator();

  const rightFacing = rightFacingCheck();

  const isNeckTiltAngleApprox90Degrees = neckTiltCalculator(calculateNeckPoint, rightFacing);

  const calculateShoulderElbowWristAngle = shoulderElbowWristCalculator(rightFacing, calculateAngle);

  const isLegsNotCrossed = legCrossCheck();

  const areFeetPlanted = feetPlantedCheck();

  const buffer = 5; // Buffer value in pixels

  const evaluateHandPosition = handPositionEvaluator(buffer);

  const renderPoseFeedback = (pose) => {
    const feedback = [];
    const isFacingRight = !isPersonFacingLeft(pose);

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
          {isFacingRight && (pose.keypoints.some(keypoint => keypoint.name === 'nose' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'left_ear' && keypoint.score < 0.2) //||
            // pose.keypoints.some(keypoint => keypoint.name === 'right_ear' && keypoint.score < 0.2))

            ? "Some keypoints not fully visible but estimated angle is " + isNeckTiltAngleApprox90Degrees(pose).toFixed(2)
            : "Current neck angle is " + isNeckTiltAngleApprox90Degrees(pose).toFixed(2))}
          {!isFacingRight && (pose.keypoints.some(keypoint => keypoint.name === 'nose' && keypoint.score < 0.2) ||
            // pose.keypoints.some(keypoint => keypoint.name === 'left_ear' && keypoint.score < 0.2) ||
            pose.keypoints.some(keypoint => keypoint.name === 'right_ear' && keypoint.score < 0.2)
            ? "Some keypoints not fully visible but estimated angle is " + isNeckTiltAngleApprox90Degrees(pose).toFixed(2)
            : "Current neck angle is " + isNeckTiltAngleApprox90Degrees(pose).toFixed(2))}
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
          {isFacingRight && ( // Check if facing right to apply the condition for right side
            pose.keypoints.some(keypoint => keypoint.name === 'left_shoulder' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'left_hip' && keypoint.score < 0.2)
              ? "Some keypoints not fully visible based on estimation angle is " + isShoulderHipKneeAngleRight(pose).toFixed(2)
              : "Current shoulder hip knee angle is " + isShoulderHipKneeAngleRight(pose).toFixed(2)
          )}
          {!isFacingRight && ( // Check if facing left to apply the condition for left side
            pose.keypoints.some(keypoint => keypoint.name === 'right_shoulder' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'right_hip' && keypoint.score < 0.2)
              ? "Some keypoints not fully visible based on estimation angle is " + isShoulderHipKneeAngleRight(pose).toFixed(2)
              : "Current shoulder hip knee angle is " + isShoulderHipKneeAngleRight(pose).toFixed(2)
          )}

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
          {isFacingRight && ( // Check if facing right to apply the condition for right side
            pose.keypoints.some(keypoint => keypoint.name === 'left_hip' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'left_knee' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'left_ankle' && keypoint.score < 0.2)
              ? "Some keypoints not fully visible based on estimation angle is " + isHipKneeFootAngleRight(pose).toFixed(2)
              : "Current hip knee foot angle is " + isHipKneeFootAngleRight(pose).toFixed(2)
          )}
          {!isFacingRight && ( // Check if facing left to apply the condition for left side
            pose.keypoints.some(keypoint => keypoint.name === 'right_hip' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'right_knee' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'right_ankle' && keypoint.score < 0.2)
              ? "Some keypoints not fully visible based on estimation angle is " + isHipKneeFootAngleRight(pose).toFixed(2)
              : "Current hip knee foot angle is " + isHipKneeFootAngleRight(pose).toFixed(2)
          )}

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
          {isFacingRight && ( // Check if facing right to apply the condition for right side
            pose.keypoints.some(keypoint => keypoint.name === 'left_shoulder' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'left_elbow' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'left_wrist' && keypoint.score < 0.2)
              ? "Some keypoints not fully visible but shoulder elbow wrist angle is " + calculateShoulderElbowWristAngle(pose).toFixed(2)
              : "Shoulder elbow wrist angle is " + calculateShoulderElbowWristAngle(pose).toFixed(2)
          )}
          {!isFacingRight && ( // Check if facing left to apply the condition for left side
            pose.keypoints.some(keypoint => keypoint.name === 'right_shoulder' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'right_elbow' && keypoint.score < 0.2) ||
              pose.keypoints.some(keypoint => keypoint.name === 'right_wrist' && keypoint.score < 0.2)
              ? "Some keypoints not fully visible but shoulder elbow wrist angle is " + calculateShoulderElbowWristAngle(pose).toFixed(2)
              : "Shoulder elbow wrist angle is " + calculateShoulderElbowWristAngle(pose).toFixed(2)
          )}

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
                          object.probability >= 0.1 && (
                            <li key={index}>{object.className + " " + object.probability.toFixed(2)}</li>
                          )
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
      <div>
        {handPoses && (
          <div>
            <h2>Detected Hand Poses</h2>
            <ul>
              {handPoses.map((handPose, index) => (
                <li key={index}>
                  <p>{evaluateHandPosition(handPose.landmarks)}</p>
                </li>
              ))}
            </ul>
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