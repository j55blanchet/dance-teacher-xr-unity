"""
    complexityanalysis.py

    This module implements various metics for complexity analysis of motion. 
    These functions can be used as difficulty heristics for pedagogical (lesson
    design) purposes, or as a view into motion similarity.

    The metrics implemented are:
        - Scalar sums of distance, velocity, acceleration, and jerk of 
          a selectable subset of joints.
        - Tempo (bpm) of accompanying music.
        - Length of motion (in frames).
"""
import typing as t
import pandas as pd
import mediapipe as mp

def get_worldspace_metrics(motion: pd.DataFrame, landmarks: t.Collection[mp.solutions.pose.PoseLandmark]):
    """
        Returns a dictionary of metrics for the given motion and joints.

        todo: normalize coordinates by torso length.

        The metrics are:
            - Distance
            - Velocity
            - Acceleration
            - Jerk
    """

    output = pd.DataFrame()

    # Get x,y,z columns for the selected joints.
    joint_cols_x = [f"{landmark.name}_x" for landmark in landmarks]
    joint_cols_y = [f"{landmark.name}_y" for landmark in landmarks]
    joint_cols_z = [f"{landmark.name}_z" for landmark in landmarks]

    # Calculate the scalar distance traveled each frame for each joint.
    for landmark in landmarks:
        output[f"{landmark.name}_distance"] = motion[[f"{landmark.name}_x", f"{landmark.name}_y", f"{landmark.name}_z"]].diff().pow(2).sum(1).pow(0.5)
        output[f"{landmark.name}_velocity"] = output[f"{landmark.name}_distance"].diff()
        output[f"{landmark.name}_acceleration"] = output[f"{landmark.name}_velocity"].diff()
        output[f"{landmark.name}_jerk"] = output[f"{landmark.name}_acceleration"].diff()

    return output