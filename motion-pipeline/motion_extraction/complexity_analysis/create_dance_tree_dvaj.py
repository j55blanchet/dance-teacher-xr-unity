
import pandas as pd
import mediapipe as mp
import typing as t
import matplotlib.pyplot as plt
import enum
import sys

from .complexityanalysis import get_landmarks_present_in_dataframe, DVAJ, calc_scalar_dvaj

PoseLandmark = mp.solutions.pose.PoseLandmark

T = t.TypeVar('T', bound=enum.Enum)
def normalize_weighting(w: t.Dict[T, float]) -> t.Dict[T, float]:
    """Normalizes a weighting dictionary to add up to 1."""    

    value_sum = sum(w.values())
    return {
        **{
            k: v / value_sum for k, v in w.items()
        }
    }

"""A feature weighting prioritizing distance and decreasing by half
for each derivative of distance (velocity, acceleration, jerk)."""
MEASURE_WEIGHTING_DECREASING: t.Final[t.Dict[DVAJ, float]] = normalize_weighting(
    {
        DVAJ.distance: 1.0,
        DVAJ.velocity: 0.5,
        DVAJ.acceleration: 0.25,
        DVAJ.jerk: 0.125
    }
)

"""An anthropomorphic weighting for the human body based on mass distribution.

    Described by Larboulette, C., & Gibet, S. (2015, August). A review of computable expressive descriptors of human motion
    Inspired by Dempster, W. T. (1955). Space requirements of the seated operator, geometrical, kinematic, and mechanical aspects of the body with special reference to the limbs. Michigan State Univ East Lansing.
"""
LANDMARK_WEIGHTING_DEMPSTER: t.Final[t.Dict[PoseLandmark, float]] = normalize_weighting(
    {
        PoseLandmark.LEFT_HIP: 0.497 / 2 + 0.05,  # root: 49.7%. 50% split between hips. Also,
                                                  #   10% of thigh is split between hip and knee.
        PoseLandmark.RIGHT_HIP: 0.497 / 2 + 0.05,
        PoseLandmark.LEFT_SHOULDER: .028,   # each shoulders: 2.8%
        PoseLandmark.RIGHT_SHOULDER: .028,
        PoseLandmark.LEFT_ELBOW: .016,      # each elbows: 1.6%
        PoseLandmark.RIGHT_ELBOW: .016,
        PoseLandmark.LEFT_WRIST: .006,      # each wrists: 0.6%
        PoseLandmark.RIGHT_WRIST: .006,
        PoseLandmark.LEFT_KNEE: 0.05 + .0465,       # 1/2 of thigh + knee: 5% + 4.65%
        PoseLandmark.RIGHT_KNEE: 0.05 + .0465,
        PoseLandmark.LEFT_ANKLE: 0.0145,      # each foot: 1.45%
        PoseLandmark.RIGHT_ANKLE: 0.0145,
        PoseLandmark.NOSE: 0.081 # head: 8.1%
    }
)

LANDMARK_WEIGHTING_BALANCED: t.Final[t.Dict[PoseLandmark, float]] = normalize_weighting(
    {
        # 4-weight for the root & torso
        PoseLandmark.LEFT_HIP: 1,
        PoseLandmark.RIGHT_HIP: 1,
        PoseLandmark.LEFT_SHOULDER: 1,
        PoseLandmark.RIGHT_SHOULDER: 1,

        # 3-weight for each limb (12 total)
        PoseLandmark.LEFT_ELBOW: 1,
        PoseLandmark.LEFT_WRIST: 2,
        PoseLandmark.RIGHT_ELBOW: 1,
        PoseLandmark.RIGHT_WRIST: 2,
        PoseLandmark.LEFT_KNEE: 1,
        PoseLandmark.RIGHT_KNEE: 1,
        PoseLandmark.LEFT_ANKLE: 2,
        PoseLandmark.RIGHT_ANKLE: 2,

        # 4-weight for the head
        PoseLandmark.LEFT_EAR: 2,
        PoseLandmark.RIGHT_EAR: 2,
    }
)

def get_weighted_dvaj(
    dvaj: pd.DataFrame, 
    measure_weighting: t.Dict[DVAJ, float] = {}, 
    landmark_weighting: t.Dict[str, float] = {}
):
    landmark_names = get_landmarks_present_in_dataframe(dvaj)

    weighted_dvaj_by_landmark = pd.DataFrame()
    weighted_dvaj = pd.DataFrame()
    for measure in DVAJ:
        for landmark in landmark_names:
            landmark_weight = landmark_weighting.get(landmark, 1.0)
            measure_weight = measure_weighting.get(measure, 1.0)
            weighted_dvaj_by_landmark[f"{landmark}_{measure.name}"] = dvaj[f"{landmark}_{measure.name}"] * landmark_weight * measure_weight
        weighted_dvaj[f"{measure.name}"] = weighted_dvaj_by_landmark[[f"{landmark}_{measure.name}" for landmark in landmark_names]].sum(axis=1)

    return weighted_dvaj

def construct_dance_tree_from_dvaj(
        title: str, 
        weighted_dvaj: pd.DataFrame,
        metric_normalization_maxes: t.Dict[DVAJ, float],
    ):
    accumlated_complexity = weighted_dvaj.cumsum()
    accumlated_complexity.plot(
        title=f"{title} Accumulated Complexity",
    )
    plt.show(block=True)

    # weighted_dvaj.plot(block=True)

    return weighted_dvaj

def generate_dvajs(
    filepaths: t.Iterable[Path],
    landmarks_to_use: t.Iterable[PoseLandmark]
):
    for holistic_csv_file in filepaths:
        # warn if the file is not a holisticdata.csv file
        if holistic_csv_file.suffix != ".holisticdata.csv":
            print(f"WARNING: {holistic_csv_file} is not a .holisticdata.csv file.", file=sys.stderr)
            continue
        data = pd.read_csv(holistic_csv_file)
        dvaj = calc_scalar_dvaj(data, landmarks_to_use)
        yield dvaj

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
        dance_tree_file = args.destdir / (filename_stem + '.dance_tree.json')
        with open(dance_tree_file, 'w') as f:
            json.dump(dance_tree, f)

        print(f"saved dance tree to {dance_tree_file}.")