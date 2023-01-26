"""
    This module is the entry point for the complexity analysis module.
"""
from typing import Collection, List, Union
import pandas as pd
import mediapipe as mp
from pathlib import Path
from .complexityanalysis import calc_scalar_dvaj, calc_dvaj_metrics, DVAJ, plot_dvaj, Stat
import matplotlib.pyplot as plt

PoseLandmarks = mp.solutions.pose.PoseLandmark

def analyze_complexities(
    files: Collection[Path], 
    start_frames: List[int],
    end_frames: List[int],
    extra_data: List[dict],
    landmarks: Collection[PoseLandmarks] = [
        PoseLandmarks.LEFT_WRIST, 
        PoseLandmarks.RIGHT_WRIST,
        PoseLandmarks.LEFT_ELBOW,
        PoseLandmarks.RIGHT_ELBOW,
        PoseLandmarks.LEFT_SHOULDER,
        PoseLandmarks.RIGHT_SHOULDER,
        PoseLandmarks.LEFT_HIP,
        PoseLandmarks.RIGHT_HIP,
        PoseLandmarks.LEFT_KNEE,
        PoseLandmarks.RIGHT_KNEE,
        PoseLandmarks.LEFT_ANKLE,
        PoseLandmarks.RIGHT_ANKLE,
        PoseLandmarks.LEFT_EYE,
        PoseLandmarks.RIGHT_EYE,
    ],
) -> pd.DataFrame:

    if len(files) == 0:
        return

    
    data = pd.read_csv(files[0])

    if start_frames[0] is not None and end_frames[0] is not None:
        data = data[start_frames[0]:end_frames[0]]
    elif start_frames[0] is not None:
        data = data[start_frames[0]:]
    elif end_frames[0] is not None:
        data = data[:end_frames[0]]

    dvaj = calc_scalar_dvaj(data, landmarks)
    metrics = calc_dvaj_metrics(dvaj)
    extra_keys = list(extra_data[0].keys())

    cols = extra_keys + list(metrics.keys())
    row = extra_data[0].copy()
    row.update(metrics)

    cols = list(metrics.keys()) + ['bpm']
    metrics.update({'bpm': bpms[0]})
    output = pd.DataFrame(
        columns=cols, 
        data=[row], 
        index=[files[0].stem.replace('.holisticdata', '')]
    )

    for i, file in enumerate(files[1:]):
        i = i + 1 # because we already did the first one
        data = pd.read_csv(file)

        if start_frames[i] is not None and end_frames[i] is not None:
            data = data[start_frames[i]:end_frames[i]]
        elif start_frames[i] is not None:
            data = data[start_frames[i]:]
        elif end_frames[i] is not None:
            data = data[:end_frames[i]]

        dvaj = calc_scalar_dvaj(data, landmarks)
        # plt.savefig(file.with_suffix('.png'))

        metrics = calc_dvaj_metrics(dvaj)

        row = extra_data[i].copy()
        row.update(metrics)
        
        new_row = pd.DataFrame(
            columns=cols, 
            data=[row], 
            index=[file.stem.replace('.holisticdata', '')]
        )

        output = pd.concat([output, new_row])
    
    # wrist_cols = [key for key in metrics.keys() if key.lower().find('wrist') != -1]
    # output.drop(wrist_cols, axis=1)

    z_score_cols = []
    for measure in DVAJ:
        for metric in Stat:
            z_score_cols.append(f'{measure.name}_{metric.name}')
    z_score_cols.append('bpm')


    for col in z_score_cols:
        mean = output[col].mean()
        stddev = output[col].std()
        z_scores = (output[col] - mean) / stddev
        output[f'{col}_zscore'] = z_scores

    composite_score = output[[f'{col}_zscore' for col in z_score_cols]].mean(axis=1)
    output['composite_score'] = composite_score

    return output

if __name__ == "__main__":
    import argparse
    import sys
    from pathlib import Path

    parser = argparse.ArgumentParser()
    parser.add_argument("--destination", type=Path, default=Path.cwd() / "metrics.csv")  
    parser.add_argument("--srcdir", type=Path, required=False)  
    parser.add_argument("--db", type=Path, required=False)
    parser.add_argument("--whitelist", "-wl", type=str, action='append')
    parser.add_argument("files", nargs="*", type=Path)
    args = parser.parse_args()

    # if srcdir is specified, add all files of the form "*.holisticdata.csv" in that directory to the list of files.
    if args.srcdir is not None:
        args.files.extend(file for file in args.srcdir.glob("*.holisticdata.csv"))
    elif len(args.files) == 0:
        print("No files specified. Use --srcdir or specify files as arguments.")
        sys.exit(1)

    if args.whitelist is not None:
        args.files = [
            file for file in args.files 
            if any(wl in file.stem for wl in args.whitelist)
        ]

    db = {}
    if args.db is not None:
        with args.db.open() as f:
            import json
            db = json.load(f)

    start_frames = []
    end_frames = []
    extra_data = []
    bpms = []
    fpses = []

    for file in args.files:
        file_clipname = file.stem.replace('.holisticdata', '')
        matches_file = lambda db_entry: db_entry.get('clipName') == file_clipname
        db_entry = next((x for x in db if matches_file(x)), None)

        if db_entry is not None:
            startTime = db_entry['startTime']
            endTime = db_entry['endTime']
            fps = db_entry['fps']
            start_frames.append(int(startTime * fps))
            end_frames.append(int(endTime * fps))
            extra_data.append({
                'bpm': db_entry.get('bpm', None),
                'fps': fps,
                'duration': endTime - startTime,
            })
        else:
            start_frames.append(None)
            end_frames.append(None)
            extra_data.append({
                'bpm': None,
                'fps': None,
                'duration': None,
            })

    output = analyze_complexities(args.files, 
        start_frames, 
        end_frames, 
        extra_data
    )

    output.to_csv(args.destination, index=True)

    print('Metrics written to', args.destination)

    sys.exit(0)
