import argparse
import os
from pathlib import Path
import mediapipe as mp
from mediapipe.tasks.python import vision
import cv2
import csv
import itertools as it
from functools import reduce
import time

flat_map = lambda f, xs: reduce(lambda a, b: a + b, map(f, xs))
get_props = lambda lm: [lm.x, lm.y, lm.z, lm.visibility]
map_props = lambda lms: flat_map(get_props, lms)


def process_video(pose_landmarker, input_path, output_path):

    start_time = time.time_ns()

    cap = cv2.VideoCapture(str(input_path))
    fps = cap.get(cv2.CAP_PROP_FPS)

    POSE_LANDMARKS = list(mp.solutions.pose.PoseLandmark)
    PROPS = ['x', 'y', 'z', 'visibility']
    
    
    with open(output_path, 'w', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        
        csvwriter.writerow(
            ['frame', 'timestamp', 'is_valid'] + \
            [f'{lm.name}_{prop}_2d' for lm in POSE_LANDMARKS for prop in PROPS] + \
            [f'{lm.name}_{prop}_3d' for lm in POSE_LANDMARKS for prop in PROPS])
        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                # End of video reached
                break
            
            timestamp = fps * frame_idx
            timestamp_ns = int(timestamp * 1e9)
            # per https://github.com/google-ai-edge/mediapipe/issues/5265,
            # the metal implementaiton only supports image formats with an alpha channel
            frame_rgba = cv2.cvtColor(frame, cv2.COLOR_BGR2RGBA)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGBA, data=frame_rgba)            
            results = pose_landmarker.detect_for_video(mp_image, timestamp_ns)
            if not results.pose_landmarks or not results.pose_world_landmarks:
                csvwriter.writerow(
                    [frame_idx, timestamp, False] +
                    [None] * (len(POSE_LANDMARKS) * len(PROPS) * 2)
                )
            if results.pose_landmarks and results.pose_world_landmarks:
                PERSON_ID = 0 # only one person in the video
                csvwriter.writerow(
                    [frame_idx, timestamp, True] + 
                    map_props(results.pose_landmarks[PERSON_ID]) +
                    map_props(results.pose_world_landmarks[PERSON_ID])
                )

                # for idx, (landmark_2d, landmark_3d) in enumerate(zip(results.pose_landmarks.landmark, results.pose_world_landmarks.landmark)):
                #     csvwriter.writerow([
                #         frame_idx, idx, True,
                #         landmark_2d.x, landmark_2d.y, landmark_2d.z, landmark_2d.visibility,
                #         landmark_3d.x, landmark_3d.y, landmark_3d.z, landmark_3d.visibility
                #     ])
            frame_idx += 1
    cap.release()
    end_time = time.time_ns()
    elapsed_time = (end_time - start_time) / 1e9
    print(f'\tProcessed {frame_idx} frames in {elapsed_time:.2f} seconds ({frame_idx / elapsed_time:.2f} fps)')

def check_csv_video_match(csv_path, video_path):
    cap = cv2.VideoCapture(str(video_path))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.release()

    with open(csv_path, 'r') as csvfile:
        csvreader = csv.reader(csvfile)
        row_count = sum(1 for row in csvreader) - 1  # subtract 1 for header

    if frame_count < 10:
        return True # don't overwrite if video is too short
    
    
    # Mediapipe won't detect landmarks 
    difference = abs(frame_count - row_count)
    min_frames = min(frame_count, row_count)
    percentage = difference / max(min_frames, 1) # avoid division by zero
    
    return difference <= 1 or percentage < 0.20

def main():
    parser = argparse.ArgumentParser(description='Process videos to extract pose estimations.')
    parser.add_argument('input_dir', type=Path, help='Input directory containing .mp4 files')
    parser.add_argument('output_dir', type=Path, help='Output directory to save .pose.csv files')
    parser.add_argument('-o', '--overwrite', action='store_true', help='Overwrite existing pose files')
    
    args = parser.parse_args()
    input_dir: Path = args.input_dir
    output_dir: Path = args.output_dir
    overwrite: bool = args.overwrite

    file_list = list(input_dir.rglob('*.mp4'));
    relative_paths = [input_path.relative_to(input_dir) for input_path in file_list]
    longest_relpath_len = max(len(str(relpath)) for relpath in relative_paths)
    num_files = len(file_list)
    num_files_digits = len(str(num_files))

    
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode
    # model is located at same directory as this script
    model_path = os.path.join(os.path.dirname(__file__), 'pose_landmarker_heavy.task')
    
    landmarker_delegate = mp.tasks.BaseOptions.Delegate.GPU
    # on windows, set the delegate to CPU
    if os.name == 'nt':
        landmarker_delegate = mp.tasks.BaseOptions.Delegate.CPU

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path,
                                 delegate=landmarker_delegate
        ),
        running_mode=VisionRunningMode.VIDEO,
    )

    # Disable non-fatal logging from the glog system
    os.environ['GLOG_minloglevel'] = '3'

    for file_i, relative_path in enumerate(relative_paths):
        input_path = input_dir / relative_path
        output_path = output_dir / relative_path.with_suffix('.pose.csv')
        padded_relative_path = str(relative_path).ljust(longest_relpath_len, ' ')
        print(f'{str(file_i+1).zfill(num_files_digits)}/{num_files}: {padded_relative_path} ', end='')
        if not overwrite and output_path.exists():
            if check_csv_video_match(output_path, input_path):
                print(f'skipping              ')
                continue
            else:
                print(f'overwriting (mismatch)')
        else:
            print(f'creating         ')

        print("\t", end='') # indent the mediapipe output (for better formatted logs)

        with PoseLandmarker.create_from_options(options) as pose:    
            output_path.parent.mkdir(parents=True, exist_ok=True)
            process_video(pose, input_path, output_path)

if __name__ == '__main__':
    main()