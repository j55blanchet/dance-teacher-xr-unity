from pathlib import Path
import sys
from typing import Callable, Generator, TypeVar, Optional
import cv2
from matplotlib import pyplot as plt
import mediapipe as mp
import numpy as np
import pandas as pd
from functools import reduce
import csv
import logging

from .utils import throttle

PoseLandmark: mp.solutions.mediapipe.python.solutions.holistic.PoseLandmark = mp.solutions.holistic.PoseLandmark
HandLandmark: mp.solutions.mediapipe.python.solutions.holistic.HandLandmark = mp.solutions.holistic.HandLandmark

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

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
            yield i, frame_count, on_frame(image), image

            # i += 1
    finally:
        cap.release()

def process_video(
    video_path: Path, 
    output_root: Path, 
    holistic_solution: mp.solutions.mediapipe.python.solutions.holistic.Holistic,
    frame_output_folder: Optional[Path] = None,
    rewrite_existing: bool = False,
):

    # Reset graph for this new file
    holistic_solution.reset()

    csv_file = video_path.with_suffix('.csv')
    if csv_file.exists():
        logging.warning(f'Skipping {video_path}')
        return

    @throttle(seconds=1)
    def print_progress(i, frame_count):
        percent_done = i / frame_count
        logging.info(f'{video_path.stem}: {percent_done:.1%}')

    holistic_data_filepath = output_root / (video_path.stem + ".holisticdata.csv")

    if holistic_data_filepath.exists() and not rewrite_existing:
        logging.info(f'Skipping {video_path} - already exists')
        return

    with(
        open(str(holistic_data_filepath), 'w', newline='', encoding='utf-8') as merged_data_file,
    ):
        merged_data_csv = csv.writer(merged_data_file)
        for frame_i, (_, frame_count, frame_data, image) in enumerate(_perform_by_frame(video_path, holistic_solution.process)):


            # cv2.imshow(f'Frame {frame_i}', image)
            # cv2.waitKey(500)

            
            
            if frame_output_folder is not None:
                image.flags.writeable = True
                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                mp_drawing.draw_landmarks(
                    image,
                    frame_data.pose_landmarks,
                    mp.solutions.holistic.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style(),
                )
                frame_output_folder.mkdir(parents=True, exist_ok=True)
                out_path_2d = f'{frame_output_folder}/{video_path.stem}_2d/{video_path.stem}_{frame_i:0{len(str(int(frame_count)))}}.jpg'
                Path(out_path_2d).parent.mkdir(parents=True, exist_ok=True)
                cv2.imwrite(out_path_2d, image)

                fig = plt.figure(f'{holistic_data_filepath.name}-frame{frame_i}')
                ax = fig.add_subplot(projection='3d')

                world_landmarks  = [
                    tuple([PoseLandmark(landmark_i), (frame_data.pose_world_landmarks.landmark[landmark_i] if frame_data.pose_world_landmarks else None)])
                    for landmark_i
                    in range(len(PoseLandmark))
                ]
                x, y, z = list(zip(*[
                    (landmark.x, -landmark.y, -landmark.z)
                    for _, landmark
                    in world_landmarks
                ]))

                # Swap x and y so that default camera angle is good
                ax.set_xlabel('X')
                ax.set_ylabel('Y')
                ax.set_zlabel('Z')
                ax.scatter(x, y, z)
                out_path = f'{frame_output_folder}/{video_path.stem}_3d/{video_path.stem}_{frame_i:0{len(str(int(frame_count)))}}.png'
                Path(out_path).parent.mkdir(parents=True, exist_ok=True)
                # plt.show(block=True)
                plt.savefig(out_path)
                plt.close()


            print_progress(frame_i, frame_count)
            if frame_i == 0:
                merged_data_csv.writerow(
                    ['frame'] + 
                    [f'{PoseLandmark(landmark_i).name}_{field}' 
                        for landmark_i in np.array(sorted(PoseLandmark))
                        for field in ('x', 'y', 'z', 'vis')
                    ] + 
                    [f'LEFTHAND_{HandLandmark(landmark_i).name}_{field}'
                        for landmark_i in np.array(sorted(HandLandmark))
                        for field in ('x', 'y', 'z')
                    ] +
                    [f'RIGHTHAND_{HandLandmark(landmark_i).name}_{field}'
                        for landmark_i in np.array(sorted(HandLandmark))
                        for field in ('x', 'y', 'z')
                    ]
                )
            
            row = [frame_i]
            
            row += list(reduce(
                    lambda x, y: x + y,
                    [
                        # We want to remap x, y, z. 
                        #   > The default has negative y being up, positive x being right, and pozitive z being away from the camera.
                        #   > We actually want y being up, x being left, and z being forward (towards camera).
                        #   So x <- x
                        #      y <- -y
                        #      z <- -z
                        [ 
                            lm.x,
                            -lm.y, 
                            -lm.z,
                            lm.visibility
                        ] if lm is not None else [None, None, None, None]
                        for lm in 
                        [(frame_data.pose_world_landmarks.landmark[landmark_i] if frame_data.pose_world_landmarks else None)
                            for landmark_i in range(len(PoseLandmark))
                        ]
                    ]
                ))
                
            row += list(reduce(
                    lambda x, y: x + y,
                    [
                        ([lm.x, lm.y, lm.z] if lm is not None else [None, None, None])
                        for lm in 
                        [(frame_data.right_hand_landmarks.landmark[landmark_i] if frame_data.right_hand_landmarks is not None else None)
                            for landmark_i in range(len(HandLandmark))
                        ]
                    ]
                ))

            row += list(reduce(
                    lambda x, y: x + y,
                    [
                        ([lm.x, lm.y, lm.z] if lm is not None else [None, None, None])
                        for lm in 
                        [(frame_data.left_hand_landmarks.landmark[landmark_i] if frame_data.left_hand_landmarks is not None else None)
                            for landmark_i in range(len(HandLandmark))
                        ]
                    ]
                ))

            merged_data_csv.writerow(row)
            
def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--video_folder', type=Path, required=True)
    parser.add_argument('--output_folder', type=Path, required=True)
    parser.add_argument('--log_level', type=str, default='INFO')
    parser.add_argument('--model-complexity', type=int, default=2)
    parser.add_argument('--frame_output_folder', type=Path, default=None)
    parser.add_argument('--rewrite_existing', action='store_true')
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
    video_paths = video_folder
    if video_folder.is_dir():
        video_paths = video_folder.glob('*.mp4')
    else:
        video_paths = video_folder.parent.glob(video_folder.name)

    for video_path in video_paths:
        process_video(
            video_path, 
            holistic_solution=holistic_solution, 
            output_root=args.output_folder,
            frame_output_folder=args.frame_output_folder,
            rewrite_existing=args.rewrite_existing)


if __name__ == "__main__":
    main()