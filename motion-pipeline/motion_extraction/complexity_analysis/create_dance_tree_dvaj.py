from pathlib import Path
import pandas as pd
import mediapipe as mp
import typing as t
import matplotlib.pyplot as plt
import enum
import sys

from .complexityanalysis import get_pose_landmarks_present_in_dataframe, DVAJ, calc_scalar_dvaj

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

class DvajMeasureWeighting(enum.Enum):
    decreasing_by_half = enum.auto()
    decreasing_by_quarter = enum.auto()
    equal = enum.auto()

    def get_weighting(self):
        if self == DvajMeasureWeighting.decreasing_by_half:
            return normalize_weighting(
                {
                    DVAJ.distance: 1.0,
                    DVAJ.velocity: 0.5,
                    DVAJ.acceleration: 0.25,
                    DVAJ.jerk: 0.125
                }
            )
        elif self == DvajMeasureWeighting.decreasing_by_quarter:
            return normalize_weighting(
                {
                    DVAJ.distance: 1.0,
                    DVAJ.velocity: 0.75,
                    DVAJ.acceleration: 0.5,
                    DVAJ.jerk: 0.25
                }
            )
        elif self == DvajMeasureWeighting.equal:
            return normalize_weighting(
                {
                    DVAJ.distance: 1.0,
                    DVAJ.velocity: 1.0,
                    DVAJ.acceleration: 1.0,
                    DVAJ.jerk: 1.0
                }
            )
        else:
            raise ValueError(f"DvajMeasureWeighting {self} not recognized.")

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

"""A balanced weighting for the human body. (adhoc construction)"""
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

class PoseLandmarkWeighting(enum.Enum):
    balanced = enum.auto()
    dempster = enum.auto()

    def get_weighting(self):
        if self == PoseLandmarkWeighting.balanced:
            return LANDMARK_WEIGHTING_BALANCED
        elif self == PoseLandmarkWeighting.dempster:
            return LANDMARK_WEIGHTING_DEMPSTER
        else:
            raise ValueError(f"PoseLandmarkWeighting {self} not recognized.")


def get_position_relative_to_base(positions: pd.DataFrame):
    positions_relative_to_hip = pd.DataFrame()

    lhip_x, lhip_y, lhip_z  = [f"{PoseLandmark.LEFT_HIP.name}_{axis}" for axis in "xyz"]
    rhip_x, rhip_y, rhip_z  = [f"{PoseLandmark.RIGHT_HIP.name}_{axis}" for axis in "xyz"]
    
    positions_relative_to_hip["base_x"] = (positions[lhip_x] + positions[rhip_x]) / 2
    positions_relative_to_hip["base_y"] = (positions[lhip_y] + positions[rhip_y]) / 2
    positions_relative_to_hip["base_z"] = (positions[lhip_z] + positions[rhip_z]) / 2

    for landmark in get_pose_landmarks_present_in_dataframe(positions):
        positions_relative_to_hip[f"{landmark}_x"] = positions[f"{landmark}_x"] - positions_relative_to_hip["base_x"]
        positions_relative_to_hip[f"{landmark}_y"] = positions[f"{landmark}_y"] - positions_relative_to_hip["base_y"]
        positions_relative_to_hip[f"{landmark}_z"] = positions[f"{landmark}_z"] - positions_relative_to_hip["base_z"]

    return positions_relative_to_hip

def trim_df_to_convergence(df: pd.DataFrame):
    """Trims a dataframe to the last frame where the cumulative sum changes."""
    
    # Find the first index where the cumulative sum stops changing (searching backwards).
    last_changing_frame = df.shape[0] - 1
    diff = df.diff()
    for i in range(df.shape[0] - 1, -1, -1):
        if diff.iloc[i].any():
            # The cumulative sum changed, so i is the last changing frame.
            # We can throw away every frame after i.
            last_changing_frame = i
            break

    tossed_frame_count = df.shape[0] - last_changing_frame - 1
    return df.iloc[:last_changing_frame + 1], tossed_frame_count

def normalize_accumulated_dvaj(
    dvaj_cumsum: pd.DataFrame,
    metric_normalization_maxes: t.Dict[PoseLandmark, t.Dict[DVAJ, float]],
):
    """Normalizes the accumulated dvaj by the max value of each metric-landmark
    cumulative sum across the dataset."""
    cur_frames = dvaj_cumsum.shape[0]

    for landmark in metric_normalization_maxes.keys():
        for measure in metric_normalization_maxes[landmark].keys():
            normalization_factor = cur_frames * metric_normalization_maxes[landmark][measure]
            dvaj_cumsum[f"{landmark.name}_{measure.name}"] /= normalization_factor
    
    return dvaj_cumsum

def aggregate_accumulated_dvaj_by_measure(
    dvaj_cumsum: pd.DataFrame, 
    measure_weighting: t.Dict[DVAJ, float] = {}, 
    landmark_weighting: t.Dict[PoseLandmark, float] = {},
):
    landmark_names = get_pose_landmarks_present_in_dataframe(dvaj_cumsum)

    weighted_accumulated_dvaj_by_measure = pd.DataFrame()

    for measure in DVAJ:
        weighted_dvaj_by_landmark = pd.DataFrame()
        for landmark in landmark_names:
            landmark_weight = landmark_weighting.get(landmark, 1.0)
            weighted_dvaj_by_landmark[f"{landmark}_{measure.name}"] = dvaj_cumsum[f"{landmark}_{measure.name}"] * landmark_weight

        weighted_accumulated_dvaj_by_measure[f"{measure.name}"] = weighted_dvaj_by_landmark[[f"{landmark}_{measure.name}" for landmark in landmark_names]].sum(axis=1)
        weighted_accumulated_dvaj_by_measure[f"{measure.name}"] *= measure_weighting[measure]

    return weighted_accumulated_dvaj_by_measure

def construct_dance_tree_from_complexity_measures(
        title: str, 
        complexity_measures: pd.DataFrame,
    ):
    
    complexity_measures.plot(
        title=f"{title} Accumulated Complexity",
    )
    plt.show(block=True)

    return {}

def generate_dvajs(
    filepaths: t.Iterable[Path],
    landmarks_to_use: t.Iterable[PoseLandmark]
):
    for holistic_csv_file in filepaths:
        # warn if the file is not a holisticdata.csv file
        if not holistic_csv_file.name.endswith(".holisticdata.csv"):
            print(f"WARNING: {holistic_csv_file} is not a .holisticdata.csv file.", file=sys.stderr)
            continue
        data = pd.read_csv(holistic_csv_file, index_col='frame')
        relative_position = get_position_relative_to_base(data)
        dvaj = calc_scalar_dvaj(relative_position, landmarks_to_use)
        yield dvaj

if __name__ == "__main__":
    import argparse
    import sys
    import json

    parser = argparse.ArgumentParser()
    parser.add_argument("--destdir", type=Path, default=Path.cwd())  
    parser.add_argument("--srcdir", type=Path, required=False)  
    parser.add_argument("--measure_weighting", choices=[e.name for e in DvajMeasureWeighting], default=DvajMeasureWeighting.decreasing_by_quarter.name)
    parser.add_argument("--landmark_weighting", choices=[e.name for e in PoseLandmarkWeighting], default=PoseLandmarkWeighting.balanced.name)
    parser.add_argument("files", nargs="*", type=Path)
    args = parser.parse_args()

    input_files: t.List[Path] = args.files

    # if srcdir is specified, add all files of the form "*.holisticdata.csv" in that directory to the list of files.
    files_from_srcdir = []
    if args.srcdir is not None:
        files_from_srcdir = list(args.srcdir.glob("*.holisticdata.csv"))
        input_files.extend(files_from_srcdir)
    elif len(args.files) == 0:
        print("No files specified. Use --srcdir or specify files as arguments.")
        sys.exit(1)
    
    print(f"Input: {len(input_files)} files", end='')
    if args.srcdir is not None:
        print(f", {len(files_from_srcdir)} from {args.srcdir}.")
    else:
        print('.')
      
    print(f"Output: saving output dance trees to {args.destdir}.")
    args.destdir.mkdir(parents=True, exist_ok=True)

    measure_weighting_choice = DvajMeasureWeighting[args.measure_weighting]
    measure_weighting = measure_weighting_choice.get_weighting()

    landmark_weighting_choice = PoseLandmarkWeighting[args.landmark_weighting]
    landmark_weighting = landmark_weighting_choice.get_weighting()

    landmarks_to_use = [
        lm for lm in landmark_weighting.keys()
        if landmark_weighting.get(lm, 0) > 0
    ]

    print(f"Using measure weighting: {measure_weighting_choice.name}")
    print(f"Using landmark weighting: {landmark_weighting_choice.name}")

    print("Preprocessing files...")

    # Preprocess Steps:
    # 1. Calculate the dvaj by-frame for each file.
    # 2. Convert to cumulative sum (accumulated complexity).
    # 3. Trim trailing frames beyond which cumulative sum doesn't change.
    # 4. Calculate normalization denominators for each metric, on a per-frame basis.
    dvajs = [dvaj for dvaj in generate_dvajs(args.files, landmarks_to_use)]
    dvaj_cumsums = [dvaj.cumsum() for dvaj in dvajs]
    del dvajs

    dvaj_cumsums, tossed_frames = zip(*[
        trim_df_to_convergence(dvaj_cumsum) for dvaj_cumsum in dvaj_cumsums
    ])
                    
    metric_normalization_maxes: t.Dict[PoseLandmark, t.Dict[DVAJ, float]] = {
        landmark: {
            measure: max(
                dvaj[f"{landmark.name}_{measure.name}"].iloc[-1] / dvaj.shape[0]
                for dvaj in dvaj_cumsums
            )
            for measure in DVAJ
        }
        for landmark in landmarks_to_use
    }

    # Process Steps:
    # 5. Normalize each metric by its max among the dataset, adjusted
    #      by the length of the dataframe.
    # 6. Compute weighted averages of the dvajs for each metric.
    
    for i, dvaj_cumsum, file in zip(range(len(dvaj_cumsums)), dvaj_cumsums, input_files):

        filename_stem = file.stem.replace('.holisticdata', '')
        print(f"Processing {filename_stem} ({i+1}/{len(input_files)})...", end='')
        print(f"  Tossed {tossed_frames[i]} frames.", end='')
        complexity_measures = aggregate_accumulated_dvaj_by_measure(
            dvaj_cumsum,
            measure_weighting=measure_weighting,
            landmark_weighting=landmark_weighting,
        )
        dance_tree = construct_dance_tree_from_complexity_measures(filename_stem, complexity_measures)

        # Save the dance tree to a file in destdir with the same name as the holistic_csv_file, but with the extension ".dance_tree.json" instead of ".holisticdata.csv".
        dest_tree_filename = filename_stem + '.dance_tree.json'
        dest_tree_filepath = args.destdir / dest_tree_filename

        # Try to reconstruct the directory structure of the srcdir in the destdir.
        try:
            dest_tree_filepath = args.destdir / file.relative_to(args.srcdir).parent / dest_tree_filename
        except ValueError:
            pass
        
        with dest_tree_filepath.open('w') as f:
            json.dump(dance_tree, f)

        print(f"Done. Saved dance tree to {dest_tree_filepath.relative_to(args.destdir)}.")