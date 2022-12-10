"""
    mp_utils.py

    Contains utility functions for working with the MediaPipe library.

    TODO: 
    - Adapt these files to work with 3D landmarks (currently only works with 2D landmarks)
    - Integrate with complexity analysis (perhaps refactor into a mp_processing package)
    - Consider putting these functions into a class (e.g. MPUtils)
    - Consider migrating more functionality from the jbb-humanmotion-autodance teaching repo
"""

import mediapipe as mp
from pathlib import Path
import pandas as pd
from pandas import DataFrame
import numpy as np
from typing import List, Optional

from enum import IntEnum

from pandas.core.series import Series

PoseLandmark: mp.solutions.holistic.PoseLandmark = mp.solutions.holistic.PoseLandmark
HandLandmark: mp.solutions.holistic.HandLandmark = mp.solutions.holistic.HandLandmark

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

class Landmark(IntEnum):
    pass

class PoseLandmark(Landmark):
    nose = 0
    leftEyeInner = 1
    leftEye = 2
    leftEyeOuter = 3
    rightEyeInner = 4
    rightEye = 5
    rightEyeOuter = 6
    leftEar = 7
    rightEar = 8
    mouthLeft = 9
    mouthRight = 10
    leftShoulder = 11
    rightShoulder = 12
    leftElbow = 13
    rightElbow = 14
    leftWrist = 15
    rightWrist = 16
    leftPinky = 17
    rightPinky = 18
    leftIndex = 19
    rightIndex = 20
    leftThumb = 21
    rightThumb = 22
    leftHip = 23
    rightHip = 24
    leftKnee = 25
    rightKnee = 26
    leftAnkle = 27
    rightAnkle = 28
    leftHeel = 29
    rightHeel = 30
    leftFootIndex = 31
    rightFootIndex = 32

class HandLandmarks(Landmark):
    wrist = 0
    thumbCMC = 1
    thumbMCP = 2
    thumbIP = 3
    thumbTIP = 4
    indexMCP = 5
    indexPIP = 6
    indexDIP = 7
    indexTIP = 8
    middleMCP = 9
    middlePIP = 10
    middleDIP = 11
    middleTIP = 12
    ringMCP = 13
    ringPIP = 14
    ringDIP = 15
    ringTIP = 16
    pinkyMCP = 17
    pinkyPIP = 18
    pinkyDIP = 19
    pinkyTIP = 20

def get_pixel_landmarks(filepath: Path, width: int, height: int) -> DataFrame:
    """Reads a landmark file and returns numpy arrays of the frame indices and the pixel-landmark positions."""
    landmarks = pd.read_csv(str(filepath), header=0, index_col=0)
    cols = landmarks.columns
    
    # Drop visibility columns
    visibility_cols = cols[2::3]
    landmarks.drop(visibility_cols, axis=1, inplace=True)
    
    # Scale landmarks by width and height
    pixel_landmarks = landmarks
    pixel_landmarks.iloc[:, ::2] *= width   # scale all x cols by width
    pixel_landmarks.iloc[:, 1::2] *= height # scale all y cols by height

    return pixel_landmarks

def normalize_landmarks(pixel_landmarks: DataFrame, ref_a_lmarks: List[Landmark], ref_b_lmarks: List[Landmark]) -> DataFrame:

    # Calculate A & B reference positions (averages of relevant columns)
    ref_a_lmarks = np.array(ref_a_lmarks)
    ref_b_lmarks = np.array(ref_b_lmarks)
    a = pd.DataFrame()    
    a['x'] = pixel_landmarks.iloc[:, ref_a_lmarks*2].mean(axis=1)
    a['y'] = pixel_landmarks.iloc[:, ref_a_lmarks*2+1].mean(axis=1)
    b = pd.DataFrame()
    b['x'] = pixel_landmarks.iloc[:, ref_b_lmarks*2].mean(axis=1)
    b['y'] = pixel_landmarks.iloc[:, ref_b_lmarks*2+1].mean(axis=1)
    ref_xy_difference = a - b
    ref_dist = ref_xy_difference.apply(np.linalg.norm, axis=1)

    # Calculate centerpoint (midway between A and B)
    center_point = pd.DataFrame()
    center_point['x'] = (a['x'] + b['x']) / 2
    center_point['y'] = (a['y'] + b['y']) / 2

    # Transform pixel-landmarks to relative coordinates (based on centerpoint)
    pixel_relative_landmarks = pixel_landmarks.copy()
    pixel_relative_landmarks.iloc[:, 0::2] = pixel_relative_landmarks.iloc[:, 0::2].subtract(center_point['x'], axis=0)
    pixel_relative_landmarks.iloc[:, 1::2] = pixel_relative_landmarks.iloc[:, 1::2].subtract(center_point['y'], axis=0)
    
    # Normalize landmarks based on reference points distance
    normalized_landmarks = pixel_relative_landmarks.divide(ref_dist, axis=0)
    return normalized_landmarks

def choose_landmarks(normalized_landmarks: DataFrame, chosen_landmarks: List[Landmark], relative_to: Optional[List[Series]] = None) -> DataFrame:

    selection = DataFrame()
    for i, landmark_i in enumerate(chosen_landmarks):

        col_x = landmark_i * 2
        col_y = col_x + 1
        for j, col_i in enumerate((col_x, col_y)):
            col = normalized_landmarks.iloc[:, col_i]

            if relative_to is not None:
                relative_col = relative_to.iloc[:, i * 2 + j]
                col -= relative_col
                col.name += '_relativeto_' + relative_col.name

            selection[col.name] = col
        
    return selection