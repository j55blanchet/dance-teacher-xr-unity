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

import mpl_toolkits.mplot3d.art3d as art3d

PoseLandmark = mp.solutions.holistic.PoseLandmark
HandLandmark = mp.solutions.holistic.HandLandmark

mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

T = TypeVar('T')

_PRESENCE_THRESHOLD = 0.5
_VISIBILITY_THRESHOLD = 0.5
_BGR_CHANNELS = 3
from typing import List, Tuple, Mapping, Union
DrawingSpec = mp_drawing.DrawingSpec
from mediapipe.framework.formats import landmark_pb2
RED_COLOR = (0, 0, 255)
WHITE_COLOR = (224, 224, 224)
def custom_draw_landmarks(
    image: np.ndarray,
    landmark_list: landmark_pb2.NormalizedLandmarkList,
    connections: Optional[List[Tuple[int, int]]] = None,
    landmark_drawing_spec: Union[DrawingSpec,
                                 Mapping[int, DrawingSpec]] = DrawingSpec(
                                     color=RED_COLOR),
    connection_drawing_spec: Union[DrawingSpec,
                                   Mapping[Tuple[int, int],
                                           DrawingSpec]] = DrawingSpec()):
  """Draws the landmarks and the connections on the image.
  Args:
    image: A three channel BGR image represented as numpy ndarray.
    landmark_list: A normalized landmark list proto message to be annotated on
      the image.
    connections: A list of landmark index tuples that specifies how landmarks to
      be connected in the drawing.
    landmark_drawing_spec: Either a DrawingSpec object or a mapping from hand
      landmarks to the DrawingSpecs that specifies the landmarks' drawing
      settings such as color, line thickness, and circle radius. If this
      argument is explicitly set to None, no landmarks will be drawn.
    connection_drawing_spec: Either a DrawingSpec object or a mapping from hand
      connections to the DrawingSpecs that specifies the connections' drawing
      settings such as color and line thickness. If this argument is explicitly
      set to None, no landmark connections will be drawn.
  Raises:
    ValueError: If one of the followings:
      a) If the input image is not three channel BGR.
      b) If any connetions contain invalid landmark index.
  """
  if not landmark_list:
    return
  if image.shape[2] != _BGR_CHANNELS:
    raise ValueError('Input image must contain three channel bgr data.')
  image_rows, image_cols, _ = image.shape
  idx_to_coordinates = {}
  for idx, landmark in enumerate(landmark_list.landmark):
    if ((landmark.HasField('visibility') and
         landmark.visibility < _VISIBILITY_THRESHOLD) or
        (landmark.HasField('presence') and
         landmark.presence < _PRESENCE_THRESHOLD)):
      continue
    landmark_px = mp_drawing._normalized_to_pixel_coordinates(landmark.x, landmark.y,
                                                   image_cols, image_rows)
    if landmark_px:
      idx_to_coordinates[idx] = landmark_px
  if connections:
    num_landmarks = len(landmark_list.landmark)
    # Draws the connections if the start and end landmarks are both visible.
    for connection in connections:
      start_idx = connection[0]
      end_idx = connection[1]
      if not (0 <= start_idx < num_landmarks and 0 <= end_idx < num_landmarks):
        raise ValueError(f'Landmark index is out of range. Invalid connection '
                         f'from landmark #{start_idx} to landmark #{end_idx}.')
      if start_idx in idx_to_coordinates and end_idx in idx_to_coordinates:
        if isinstance(connection_drawing_spec, Mapping) and connection_drawing_spec.get(connection) is None:
            # skip things missing from the mapping
            continue
        drawing_spec = connection_drawing_spec[connection] if isinstance(
            connection_drawing_spec, Mapping) else connection_drawing_spec
        cv2.line(image, idx_to_coordinates[start_idx],
                 idx_to_coordinates[end_idx], drawing_spec.color,
                 drawing_spec.thickness)
  # Draws landmark points after finishing the connection lines, which is
  # aesthetically better.
  if landmark_drawing_spec:
    for idx, landmark_px in idx_to_coordinates.items():
      if isinstance(landmark_drawing_spec, Mapping) and landmark_drawing_spec.get(idx) is None:
        # skip things missing from the mapping
        continue
      drawing_spec = landmark_drawing_spec[idx] if isinstance(
          landmark_drawing_spec, Mapping) else landmark_drawing_spec
      # White circle border
      circle_border_radius = max(drawing_spec.circle_radius + 1,
                                 int(drawing_spec.circle_radius * 1.2))
      cv2.circle(image, landmark_px, circle_border_radius, WHITE_COLOR,
                 drawing_spec.thickness)
      # Fill color into the circle
      cv2.circle(image, landmark_px, drawing_spec.circle_radius,
                 drawing_spec.color, drawing_spec.thickness)




def construct_header_row():
    return ['frame'] + \
           [f'{PoseLandmark(landmark_i).name}_{field}' 
               for landmark_i in np.array(sorted(PoseLandmark))
               for field in ('x', 'y', 'z', 'vis')
           ] + \
           [f'LEFTHAND_{HandLandmark(landmark_i).name}_{field}'
               for landmark_i in np.array(sorted(HandLandmark))
               for field in ('x', 'y', 'z')
           ] + \
           [f'RIGHTHAND_{HandLandmark(landmark_i).name}_{field}'
               for landmark_i in np.array(sorted(HandLandmark))
               for field in ('x', 'y', 'z')
            ]

def transform_to_holistic_csvrow(frame_i: int, frame_data, as_pdSeries: bool = False):
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
                [(frame_data.right_hand_landmarks.landmark[landmark_i] if hasattr(frame_data, 'right_hand_landmarks') and frame_data.right_hand_landmarks is not None else None)
                    for landmark_i in range(len(HandLandmark))
                ]
            ]
        ))

    row += list(reduce(
            lambda x, y: x + y,
            [
                ([lm.x, lm.y, lm.z] if lm is not None else [None, None, None])
                for lm in 
                [(frame_data.left_hand_landmarks.landmark[landmark_i] if hasattr(frame_data, 'left_hand_landmarks') and frame_data.left_hand_landmarks is not None else None)
                    for landmark_i in range(len(HandLandmark))
                ]
            ]
        ))

    if as_pdSeries:
        return pd.Series(row, index=construct_header_row())

    return row

def plot_3d_pose(holistic_row_series, fig=None, ax=None, title=None):
    if fig is None and ax is None:
        fig = plt.figure(title)
    if ax is None:
        ax = fig.add_subplot(projection='3d')
        ax.set_xlabel('X')
        ax.set_ylabel('Y')
        ax.set_zlabel('Z')
    
    x, y, z = [
        [
            holistic_row_series[f'{PoseLandmark(landmark_i).name}_{field}']
            for landmark_i in range(len(PoseLandmark))
        ]
        for field in ('x', 'y', 'z')
    ]
    # Plot the joint positions
    ax.scatter(x, y, z)

    # Connect joint position skeleton
    segs = [
        [(x[i], y[i], z[i]), (x[j], y[j], z[j])] 
        for i, j in mp.solutions.holistic.POSE_CONNECTIONS
    ]
    lines = art3d.Line3DCollection(
        segs,
        colors="gray"
    )
    ax.add_collection3d(lines)

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
    holistic_solution: mp.solutions.holistic.Holistic,
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
        logging.info(f'{video_path.stem}: {i}/{frame_count} {percent_done:.1%}')

    holistic_data_filepath = output_root / (video_path.stem + ".holisticdata.csv")

    if holistic_data_filepath.exists() and not rewrite_existing:
        logging.info(f'Skipping {video_path} - already exists')
        return
    
    header_row = construct_header_row()

    with(
        open(str(holistic_data_filepath), 'w', newline='', encoding='utf-8') as merged_data_file,
    ):
        merged_data_csv = csv.writer(merged_data_file)
        for frame_i, (_, frame_count, frame_data, image) in enumerate(_perform_by_frame(video_path, holistic_solution.process)):


            # cv2.imshow(f'Frame {frame_i}', image)
            # cv2.waitKey(500)
            holistic_csv_row = transform_to_holistic_csvrow(frame_i, frame_data)
            holistic_series_row = pd.Series(holistic_csv_row, index=header_row)

            if frame_output_folder is not None:
                image.flags.writeable = True
                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

                # # # Some code to draw the analysis vectors
                # imgcpy = image.copy()
                # analysis_connection_thickness = 7
                # connections_analysis_drawing_spec = {
                #     (14, 16): mp_drawing.DrawingSpec(color=(255, 153, 153), thickness=analysis_connection_thickness),
                #     (12, 14): mp_drawing.DrawingSpec(color=(255, 204, 153), thickness=analysis_connection_thickness),
                #     (12, 11): mp_drawing.DrawingSpec(color=(255, 255, 153), thickness=analysis_connection_thickness),
                #     (12, 24): mp_drawing.DrawingSpec(color=(204, 255, 153), thickness=analysis_connection_thickness),
                #     (24, 23): mp_drawing.DrawingSpec(color=(153, 255, 204), thickness=analysis_connection_thickness),
                #     (11, 23): mp_drawing.DrawingSpec(color=(153, 204, 255), thickness=analysis_connection_thickness),
                #     (11, 13): mp_drawing.DrawingSpec(color=(204, 154, 255), thickness=analysis_connection_thickness),
                #     (13, 15): mp_drawing.DrawingSpec(color=(255, 153, 255), thickness=analysis_connection_thickness),
                # }
                # connections_analysis = frozenset(connections_analysis_drawing_spec.keys())
                # analysis_unique_lms = set()
                # for connection in connections_analysis:
                #     analysis_unique_lms.add(connection[0])
                #     analysis_unique_lms.add(connection[1])
                # analysis_unique_lms = frozenset(analysis_unique_lms)
                # analysis_lm_drawing_spec = {
                #     lm: mp_drawing.DrawingSpec(color=(244, 244, 244), thickness=analysis_connection_thickness + 2)
                #     for lm in analysis_unique_lms
                # }

                # custom_draw_landmarks(
                #     imgcpy,
                #     frame_data.pose_landmarks,
                #     connections_analysis,
                #     landmark_drawing_spec=analysis_lm_drawing_spec,
                #     connection_drawing_spec=connections_analysis_drawing_spec
                # )
                # cv2.imwrite('temp.jpg', imgcpy)

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

                if frame_data.pose_world_landmarks is not None:
                    plot_3d_pose(
                        holistic_series_row, 
                        title=f'{holistic_data_filepath.name}-frame{frame_i}'
                    )

                    out_path = f'{frame_output_folder}/{video_path.stem}_3d/{video_path.stem}_{frame_i:0{len(str(int(frame_count)))}}.png'
                    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

                    ax = plt.gca()
                    ax.azim = -92
                    ax.elev = 118
                    ax.dist = 10
                    
                    # plt.show(block=True)
                    plt.savefig(out_path)
                    # plt.show(block=True)
                    plt.close()

            print_progress(frame_i, frame_count)
            if frame_i == 0:
                merged_data_csv.writerow(
                    header_row
                )
            
            merged_data_csv.writerow(holistic_csv_row)
            
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