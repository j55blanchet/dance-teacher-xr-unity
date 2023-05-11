
import pandas as pd
import mediapipe as mp
import typing as t
import matplotlib.pyplot as plt

from .complexityanalysis import get_landmarks_present_in_dataframe, DVAJ, calc_scalar_dvaj

def construct_dance_tree_from_dvaj(title: str, dvaj: pd.DataFrame, measure_weighting: t.Dict[DVAJ, float] = {}, landmark_weighting: t.Dict[str, float] = {}):
    landmark_names = get_landmarks_present_in_dataframe(dvaj)

    weighted_dvaj = pd.DataFrame()
    for measure in DVAJ:
        for landmark in landmark_names:
            landmark_weight = landmark_weighting.get(landmark, 1.0)
            measure_weight = measure_weighting.get(measure, 1.0)
            weighted_dvaj[f"{landmark}_{measure.name}"] = dvaj[f"{landmark}_{measure.name}"] * landmark_weight * measure_weight


    weighted_dvaj.cumsum().plot(
        title=f"{title} Weighted DVAJ",
        layout=(2,2),
        subplots=[ 
            tuple([
                f"{landmark}_{measure.name}" 
                for landmark 
                in landmark_names
            ])
            for measure 
            in DVAJ
        ]
    )
    plt.show(block=True)

    # weighted_dvaj.plot(block=True)

    return weighted_dvaj

if __name__ == "__main__":
    import argparse
    import sys
    from pathlib import Path
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("--destdir", type=Path, default=Path.cwd() / "metrics.csv")  
    parser.add_argument("--srcdir", type=Path, required=False)  
    parser.add_argument("files", nargs="*", type=Path)
    args = parser.parse_args()

    # if srcdir is specified, add all files of the form "*.holisticdata.csv" in that directory to the list of files.
    if args.srcdir is not None:
        args.files.extend(file for file in args.srcdir.glob("*.holisticdata.csv"))
    elif len(args.files) == 0:
        print("No files specified. Use --srcdir or specify files as arguments.")
        sys.exit(1)
    
    print(f"Processing {len(args.files)} files", end='')
    if args.srcdir is not None:
        print(f" from {args.srcdir}.")
    else:
        print('.')
      
    print(f"Saving output dance trees to {args.destdir}.")
    args.destdir.mkdir(parents=True, exist_ok=True)

    landmarks_to_use = [
        mp.solutions.pose.PoseLandmark.LEFT_WRIST,
        mp.solutions.pose.PoseLandmark.RIGHT_WRIST,
    ]

    for holistic_csv_file in args.files:    
        print(f"Processing {holistic_csv_file}...", end='')
        filename_stem = holistic_csv_file.stem.replace('.holisticdata', '')
        data = pd.read_csv(holistic_csv_file)
        dvaj = calc_scalar_dvaj(data, landmarks_to_use)

        dance_tree = construct_dance_tree_from_dvaj(filename_stem, dvaj)

        # Save the dance tree to a file in destdir with the same name as the holistic_csv_file, but with the extension ".dance_tree.json" instead of ".holisticdata.csv".
        dance_tree_file = args.destdir / filename_stem + '.dance_tree.json'
        with open(dance_tree_file, 'w') as f:
            json.dump(dance_tree, f)

        print(f"saved dance tree to {dance_tree_file}.")
