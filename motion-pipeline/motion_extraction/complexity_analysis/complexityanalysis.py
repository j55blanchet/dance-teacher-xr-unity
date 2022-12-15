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
from enum import Enum, auto
import typing as t
import pandas as pd
import mediapipe as mp
import matplotlib.pyplot as plt

class DVAJ(Enum):
    distance = auto()
    velocity = auto()
    acceleration = auto()
    jerk = auto()

class Stat(Enum):
    mean = auto()
    sum = auto()
    # MAX = "max"
    # MIN = "min"

def calc_scalar_dvaj(motion: pd.DataFrame, landmarks: t.Collection[mp.solutions.pose.PoseLandmark]) -> pd.DataFrame:
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
        output[f"{landmark.name}_{DVAJ.distance.name}"] = motion[[f"{landmark.name}_x", f"{landmark.name}_y", f"{landmark.name}_z"]].diff().pow(2).sum(1).pow(0.5)
        output[f"{landmark.name}_{DVAJ.velocity.name}"] = output[f"{landmark.name}_{DVAJ.distance.name}"].diff().abs()
        output[f"{landmark.name}_{DVAJ.acceleration.name}"] = output[f"{landmark.name}_{DVAJ.velocity.name}"].diff().abs()
        output[f"{landmark.name}_{DVAJ.jerk.name}"] = output[f"{landmark.name}_{DVAJ.acceleration.name}"].diff().abs()

    return output

def get_landmarks_present_in_dataframe(frame: pd.DataFrame): 
    return list(set([
        col_name[:col_name.rfind('_')] if col_name.rfind('_') >= 0 else col_name
        for col_name in frame.columns
    ]))

def get_metric_name(measure: DVAJ, stat: Stat, target_landmark: str = None):
    if target_landmark is None:
        return f"{measure.name}_{stat.name}"
    else:
        return f"{target_landmark}_{measure.name}_{stat.name}"

def calc_dvaj_metrics(dvaj: pd.DataFrame) -> t.Dict[str, float]:
    landmark_names = get_landmarks_present_in_dataframe(dvaj)
    
    metrics = {}
    for measure in DVAJ:
        for landmark_name in landmark_names:
            metrics[get_metric_name(measure, Stat.sum,  landmark_name)] = dvaj[f"{landmark_name}_{measure.name}"].sum()
            metrics[get_metric_name(measure, Stat.mean, landmark_name)] = dvaj[f"{landmark_name}_{measure.name}"].mean()
        
        # Calculate the sum and average of the sum of all joints.
        metrics[get_metric_name(measure, Stat.sum)]  = dvaj[[f"{landmark}_{measure.name}" for landmark in landmark_names]].sum().sum()
        metrics[get_metric_name(measure, Stat.mean)] = dvaj[[f"{landmark}_{measure.name}" for landmark in landmark_names]].sum().mean()
    
    return metrics

def plot_dvaj(dvaj: pd.DataFrame, ax: plt.Axes = None):
    landmark_names = get_landmarks_present_in_dataframe(dvaj)

    if ax is None:
        ax = plt.gca()

    for col in dvaj.columns:
        ax.plot(dvaj[col], label=col)
    ax.legend()
    
    