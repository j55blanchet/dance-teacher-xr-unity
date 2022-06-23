from pathlib import Path
import sys
from typing import Callable, Generator, TypeVar
import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
from functools import reduce
import csv
import logging
from .utils import throttle
from .pose_visualization import visualize_hand, visualize_pose, visualize_skeleton

PoseLandmark: mp.solutions.mediapipe.python.solutions.holistic.PoseLandmark = mp.solutions.holistic.PoseLandmark
HandLandmark: mp.solutions.mediapipe.python.solutions.holistic.HandLandmark = mp.solutions.holistic.HandLandmark

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

def merge_pose_data(
    worldframe_pose__data: pd.DataFrame,
    righthand_normalized_data: pd.DataFrame,
    lefthand_normalized_data: pd.DataFrame,
    output_filepath: Path,
):
    righthand_normalized_data = righthand_normalized_data.add_prefix('RIGHT_')
    lefthand_normalized_data = lefthand_normalized_data.add_prefix('LEFT_')
    
    # Merge the dataframes
    data = worldframe_pose__data.merge(righthand_normalized_data, how='outer', on='frame')

    data = data.merge(lefthand_normalized_data, how='outer', on='frame')

    with open(output_filepath, 'w', encoding='utf-8') as f:
        data.to_csv(f, index=True, index_label='frame')

    return data
    

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Merge pose data into a 3d skeleton animation')
    
    parser.add_argument('--worldpose_file', type=Path, required=True, help='Path to the pose (world frame) csv file')
    parser.add_argument('--righthand_file', type=Path, required=True, help='Path to the right hand csv file')
    parser.add_argument('--lefthand_file', type=Path, required=True, help='Path to the left hand csv file')
    parser.add_argument('--output_file', type=Path, required=True, help='Path to the output csv file')
    parser.add_argument('--log_level', type=str, default='INFO')

    args = parser.parse_args()

    logging.basicConfig(
        stream=sys.stdout,
        level=args.log_level.upper(),
    )

    with (
        args.worldpose_file.open('r') as worldpose_file,
        args.righthand_file.open('r') as righthand_file,
        args.lefthand_file.open('r') as lefthand_file,
    ):

        worldframe_pose__data = pd.read_csv(worldpose_file, index_col='frame')
        righthand_normalized_data = pd.read_csv(righthand_file, index_col='frame')
        lefthand_normalized_data = pd.read_csv(lefthand_file, index_col='frame')

        args.output_file.parent.mkdir(parents=True, exist_ok=True)


        merge_pose_data(
            worldframe_pose__data,
            righthand_normalized_data,
            lefthand_normalized_data,
            args.output_file,
        )