export function legCrossCheck() {
    return (pose) => {
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
}
export function shoulderElbowWristCalculator(rightFacing, calculateAngle) {
    return (pose) => {
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
}
export function rightFacingCheck() {
    return (pose) => {
        const leftEar = pose.keypoints.find(keypoint => keypoint.name === 'left_ear');
        const rightEar = pose.keypoints.find(keypoint => keypoint.name === 'right_ear');
        const leftKnee = pose.keypoints.find(keypoint => keypoint.name === 'left_knee');
        const rightKnee = pose.keypoints.find(keypoint => keypoint.name === 'right_knee');

        if (!leftEar || !rightEar || !leftKnee || !rightKnee) {
            return false; // Unable to determine facing direction if any required keypoints are missing
        }

        return rightEar.x > rightKnee.x && leftEar.x > leftKnee.x;
    };
}
export function neckTiltCalculator(calculateNeckPoint, rightFacing) {
    return (pose) => {
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

        return angleDegrees;
    };
}
export function neckPointCalculator() {
    return (pose) => {
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
}
export function hipKneeFootCalculator(isPersonFacingLeft, calculateAngle) {
    return (pose) => {
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
}
export function shoulderHipKneeCalculator(calculateAngle, isPersonFacingLeft) {
    return (pose) => {
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
}
export function angleCalculator() {
    return (point1, point2, point3) => {
        const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) - Math.atan2(point1.y - point2.y, point1.x - point2.x);
        let angle = radians * (180 / Math.PI);
        angle = Math.abs(angle);
        return angle > 180 ? 360 - angle : angle;
    };
}
export function leftFacingCheck() {
    return (pose) => {
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
} export function feetPlantedCheck() {
    return (pose) => {
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
}

