import argparse
import os
from pathlib import Path
import mediapipe as mp
import cv2
import csv
import itertools as it
from functools import reduce

flat_map = lambda f, xs: reduce(lambda a, b: a + b, map(f, xs))
get_props = lambda lm: [lm.x, lm.y, lm.z, lm.visibility]
map_props = lambda lms: flat_map(get_props, lms)

def process_video(input_path, output_path):
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose()
    cap = cv2.VideoCapture(str(input_path))
    POSE_LANDMARKS = list(mp.solutions.pose.PoseLandmark)
    PROPS = ['x', 'y', 'z', 'visibility']
    with open(output_path, 'w', newline='') as csvfile:
        csvwriter = csv.writer(csvfile)
        
        csvwriter.writerow(
            ['frame', 'is_valid'] + \
            [f'{lm.name}_{prop}_2d' for lm in POSE_LANDMARKS for prop in PROPS] + \
            [f'{lm.name}_{prop}_3d' for lm in POSE_LANDMARKS for prop in PROPS])
        frame_idx = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                # End of video reached
                break

            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)
            if not results.pose_landmarks or not results.pose_world_landmarks:
                csvwriter.writerow(
                    [frame_idx, False] +
                    [None] * (len(POSE_LANDMARKS) * len(PROPS) * 2)
                )
            if results.pose_landmarks and results.pose_world_landmarks:
                csvwriter.writerow(
                    [frame_idx, True] + 
                    map_props(results.pose_landmarks.landmark) +
                    map_props(results.pose_world_landmarks.landmark)
                )

                # for idx, (landmark_2d, landmark_3d) in enumerate(zip(results.pose_landmarks.landmark, results.pose_world_landmarks.landmark)):
                #     csvwriter.writerow([
                #         frame_idx, idx, True,
                #         landmark_2d.x, landmark_2d.y, landmark_2d.z, landmark_2d.visibility,
                #         landmark_3d.x, landmark_3d.y, landmark_3d.z, landmark_3d.visibility
                #     ])
            frame_idx += 1
    cap.release()

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
    percentage = difference / min_frames
    
    return difference <= 1 or percentage < 0.05

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
            
        output_path.parent.mkdir(parents=True, exist_ok=True)
        process_video(input_path, output_path)

if __name__ == '__main__':
    main()