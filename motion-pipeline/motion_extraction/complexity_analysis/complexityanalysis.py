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

def calc_scalar_dvaj(motion: pd.DataFrame, landmark_names: t.Collection[str]) -> pd.DataFrame:
    """
        Returns a dictionary of metrics for the given motion and joints.

        todo: normalize coordinates by torso length.

        The metrics are:
            - Distance
            - Velocity
            - Acceleration
            - Jerk
    """
    out_cols = []
    out_data = []

    # Calculate the scalar distance traveled each frame for each joint.
    for landmark in landmark_names:
        dist_col = f"{landmark}_{DVAJ.distance.name}"
        velocity_col = f"{landmark}_{DVAJ.velocity.name}"
        acceleration_col = f"{landmark}_{DVAJ.acceleration.name}"
        jerk_col = f"{landmark}_{DVAJ.jerk.name}"

        dist_data = motion[[f"{landmark}_x", f"{landmark}_y", f"{landmark}_z"]].diff().pow(2).sum(1).pow(0.5)
        velocity_data = dist_data.diff().abs()
        acceleration_data = velocity_data.diff().abs()
        jerk_data = acceleration_data.diff().abs()

        out_cols.extend([dist_col, velocity_col, acceleration_col, jerk_col])
        out_data.extend([dist_data, velocity_data, acceleration_data, jerk_data])

    return pd.concat(out_data, axis=1, keys=out_cols)


def get_all_landmarks_in_dataframe(frame: pd.DataFrame) -> t.List[str]:
    return list(set([
        col_name[:col_name.rfind('_')] if col_name.rfind('_') >= 0 else col_name
        for col_name in frame.columns
    ]))

def get_pose_landmarks_present_in_dataframe(frame: pd.DataFrame) -> t.List[str]: 
    all_landmarks = get_all_landmarks_in_dataframe(frame)
    lms = []
    for lm in all_landmarks:
        try:
            pose_landmark = mp.solutions.pose.PoseLandmark[lm]
            lms.append(lm)
        except KeyError:
            pass
    return lms

def get_metric_name(measure: DVAJ, stat: Stat, target_landmark: str = None):
    if target_landmark is None:
        return f"{measure.name}_{stat.name}"
    else:
        return f"{target_landmark}_{measure.name}_{stat.name}"

def calc_dvaj_metrics(dvaj: pd.DataFrame) -> t.Dict[str, float]:
    landmark_names = get_pose_landmarks_present_in_dataframe(dvaj)
    
    metrics = {}
    frameCount = dvaj.shape[0]
    metrics['frameCount'] = frameCount
    landmarkCount = len(landmark_names)
    metrics['landmarkCount'] = landmarkCount

    for measure in DVAJ:
        # for landmark_name in landmark_names:
            # metrics[get_metric_name(measure, Stat.sum,  landmark_name)] = dvaj[f"{landmark_name}_{measure.name}"].sum()
            # metrics[get_metric_name(measure, Stat.mean, landmark_name)] = dvaj[f"{landmark_name}_{measure.name}"].mean()
        

        # Calculate the sum and average of the sum of all joints.
        dvaj_all_landmarks = dvaj[[f"{landmark}_{measure.name}" for landmark in landmark_names]].sum(axis=1)

        metrics[get_metric_name(measure, Stat.sum)]  = dvaj_all_landmarks.sum()
        metrics[get_metric_name(measure, Stat.mean)] = dvaj_all_landmarks.sum() / (landmarkCount * frameCount)
    
    return metrics

def plot_dvaj(dvaj: pd.DataFrame, ax: plt.Axes = None):
    landmark_names = get_pose_landmarks_present_in_dataframe(dvaj)

    if ax is None:
        ax = plt.gca()

    for col in dvaj.columns:
        ax.plot(dvaj[col], label=col)
    ax.legend()
    

