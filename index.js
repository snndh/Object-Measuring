import * as THREE from 'three';
import jsfeat from 'jsfeat';
import * as cv from 'cv.js';
import * as ar from 'ar.js';

const video = document.createElement('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');

// Set up the AR marker detector
const marker = new ar.Marker({
    type: 'pattern',
    patternUrl: 'assets/patterns/pattern-marker.patt',
    width: 1,
    height: 1,
});

// Set up the camera calibration
const cameraParameters = new ar.CameraParameters(video, canvas.width, canvas.height);
cameraParameters.setProjectionMatrix(new THREE.Matrix4().fromArray([
    2.3203287123876013, 0.0, 0.0, 0.0,
    0.0, 2.3203287123876013, 0.0, 0.0,
    0.0, 0.0, -1.0001000050003333, -0.20001000050003333,
    0.0, 0.0, -1.0, 0.0,
]));

// Start the video stream
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.play();
}).catch((error) => {
    console.error('Could not access video stream', error);
});

// Render loop
function render() {
    requestAnimationFrame(render);

    // Draw the video stream onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get the image data from the canvas
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Detect the AR marker in the image
    const markerResult = marker.detect(imageData);

  //

    // If the marker was detected, calculate the size of the object in the real world
    if (markerResult) {
        // Get the corners of the marker
        const corners = markerResult.corners;


        // Convert the corners to a format that can be used by cv.js
        const cvCorners = new cv.Mat(corners.length, 1, cv.CV_32FC2);
        for (let i = 0; i < corners.length; i++) {
            cvCorners.data32F[i * 2] = corners[i].x;
            cvCorners.data32F[i * 2 + 1] = corners[i].y;
        }

        // Calculate the size of the object in pixels
        const cvSize = new cv.Mat();
        cvSize.data32F = new Float32Array([1.0, 1.0]);
        cvSize.rows = 1;
        cvSize.cols = 2;
        cvSize.step = cvSize.cols * cvSize.elemSize1();

        const cvResult = new cv.Mat();
        cv.solvePnP(cvCorners, cvSize, cameraParameters.cameraMatrix, cameraParameters.distCoeffs, cvResult);

        const modelPoints = new cv.Mat(corners.length, 3, cv.CV_32FC1);
        const objectPoints = new cv.Mat(corners.length, 3, cv.CV_32FC1);

        for (let i = 0; i < corners.length; i++) {
            const corner = corners[i];
            modelPoints.data32F[i * 3] = 0;
            modelPoints.data32F[i * 3 + 1] = 0;
            modelPoints.data32F[i * 3 + 2] = 0;
            objectPoints.data32F[i * 3] = corner.x;
            objectPoints.data32F[i * 3 + 1] = corner.y;
            objectPoints.data32F[i * 3 + 2] = 0;
        }

        const rvec = new cv.Mat();
        const tvec = new cv.Mat();

        cv.solvePnP(modelPoints, objectPoints, cameraParameters.cameraMatrix, cameraParameters.distCoeffs, rvec, tvec);

        const distance = Math.sqrt(tvec.data32F[0] ** 2 + tvec.data32F[1] ** 2 + tvec.data32F[2] ** 2);

        console.log(`Distance: ${distance} meters`);

        cvCorners.delete();
        cvSize.delete();
        cvResult.delete();
        modelPoints.delete();
        objectPoints.delete();
        rvec.delete();
        tvec.delete();
    }
}

render();
