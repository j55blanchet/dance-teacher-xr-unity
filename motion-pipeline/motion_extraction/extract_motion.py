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

PoseLandmark: mp.solutions.mediapipe.python.solutions.holistic.PoseLandmark = mp.solutions.holistic.PoseLandmark
HandLandmark: mp.solutions.mediapipe.python.solutions.holistic.HandLandmark = mp.solutions.holistic.HandLandmark

T = TypeVar('T')

def _perform_by_frame(video_path: Path, on_frame: Callable[[cv2.Mat, int], T]) -> Generator[T, None, None]:
    try:
        cap = cv2.VideoCapture(str(video_path))
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        frame_count = 1 if frame_count == 0 else frame_count
        i = 0
        while cap.isOpened():
            success, image = cap.read()
            if not success:
                return
                # raise Exception('Error reading image from video')

            # Convert the BGR image to RGB.
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # To improve performance, optionally mark the image as not writeable to pass by reference.
            image.flags.writeable = False
            # percent_done = int(i * 100 / frame_count)
            # print(f'{percent_done}% ', end='')
            yield i, frame_count, on_frame(image)
            # i += 1
    finally:
        cap.release()

def process_video(video_path: Path, output_root: Path, holistic_solution: mp.solutions.mediapipe.python.solutions.holistic.Holistic):

    # Reset graph for this new file
    holistic_solution.reset()

    csv_file = video_path.with_suffix('.csv')
    if csv_file.exists():
        logging.warning(f'Skipping {video_path}')
        return

    @throttle(seconds=1)
    def print_progress(i, frame_count):
        percent_done = int(i * 100 / frame_count)
        logging.info(f'{video_path.stem}: {percent_done}%')

    pose_landmark_filepath = output_root / (video_path.stem + "_worldpose.csv")
    righthand_landmark_filepath = output_root / (video_path.stem + "_righthand.csv")
    lefthand_landmark_filepath = output_root / (video_path.stem + "_lefthand.csv")
    with(
        open(str(pose_landmark_filepath), 'w', encoding='utf-8') as pose_file,
        open(str(righthand_landmark_filepath), 'w', encoding='utf-8') as righthand_file,
        open(str(lefthand_landmark_filepath), 'w', encoding='utf-8') as lefthand_file
    ):
        pose_csv = csv.writer(pose_file)
        righthand_csv = csv.writer(righthand_file)
        lefthand_csv = csv.writer(lefthand_file)
        for frame_i, (_, frame_count, frame_data) in enumerate(_perform_by_frame(video_path, holistic_solution.process)):
            print_progress(frame_i, frame_count)
            if frame_i == 0:
                pose_csv.writerow(
                    ['frame'] + 
                    [f'{PoseLandmark(landmark_i).name}_{field}' 
                        for landmark_i in np.array(sorted(PoseLandmark))
                        for field in ('x', 'y', 'z', 'vis')
                    ]
                )
                righthand_csv.writerow(
                    ['frame'] +
                    [f'{HandLandmark(landmark_i).name}_{field}'
                        for landmark_i in np.array(sorted(HandLandmark))
                        for field in ('x', 'y', 'z')
                    ]
                )
                lefthand_csv.writerow(
                    ['frame'] +
                    [f'{HandLandmark(landmark_i).name}_{field}'
                        for landmark_i in np.array(sorted(HandLandmark))
                        for field in ('x', 'y', 'z')
                    ]
                )  
            
            if frame_data.pose_world_landmarks:
                pose_csv.writerow(
                    [frame_i] + 
                    list(reduce(
                        lambda x, y: x + y,
                        [
                            [lm.x, lm.y, lm.z]
                            for lm in 
                            [frame_data.pose_world_landmarks.landmark[landmark_i]
                                for landmark_i in range(len(frame_data.pose_world_landmarks.landmark))
                            ]
                        ]
                    ))
                )

            if frame_data.right_hand_landmarks:
                righthand_csv.writerow(
                    [frame_i] +
                    list(reduce(
                        lambda x, y: x + y,
                        [
                            [lm.x, lm.y, lm.z]
                            for lm in 
                            [frame_data.right_hand_landmarks.landmark[landmark_i]
                                for landmark_i in range(len(frame_data.right_hand_landmarks.landmark))
                            ]
                        ]
                    ))
                )
            
            if frame_data.left_hand_landmarks:
                lefthand_csv.writerow(
                    [frame_i] +
                    list(reduce(
                        lambda x, y: x + y,
                        [
                            [lm.x, lm.y, lm.z]
                            for lm in 
                            [frame_data.left_hand_landmarks.landmark[landmark_i]
                                for landmark_i in range(len(frame_data.left_hand_landmarks.landmark))
                            ]
                        ]
                    ))
                )

def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--video_folder', type=Path, required=True)
    parser.add_argument('--output_folder', type=Path, required=True)
    parser.add_argument('--log_level', type=str, default='INFO')
    parser.add_argument('--model-complexity', type=int, default=2)
    args = parser.parse_args()

    logging.basicConfig(
        stream=sys.stdout,
        level=args.log_level.upper(),
    )

    holistic_solution: mp.solutions.mediapipe.python.solutions.holistic.Holistic = mp.solutions.holistic.Holistic(
        static_image_mode=False,
        model_complexity=args.model_complexity,
        enable_segmentation=False
    )

    if not args.output_folder.exists():
        args.output_folder.mkdir(parents=True)

    video_folder = Path(args.video_folder)
    for video_path in video_folder.glob('*.mp4'):
        process_video(video_path, holistic_solution=holistic_solution, output_root=args.output_folder)


if __name__ == "__main__":
    main()