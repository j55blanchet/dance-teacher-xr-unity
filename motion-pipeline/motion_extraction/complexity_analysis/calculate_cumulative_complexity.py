from collections import defaultdict
from pathlib import Path
import time
import pandas as pd
import mediapipe as mp
import typing as t
import matplotlib.pyplot as plt
import enum
import sys
from tqdm import tqdm, trange

from .uist_complexityanalysis import get_pose_landmarks_present_in_dataframe, DVAJ, calc_scalar_dvaj

PoseLandmark = mp.solutions.pose.PoseLandmark # type: ignore

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
    
    axes = ["x", "y", "z"]
    axes_with_vis = axes + ["vis"]

    lhip_x, lhip_y, lhip_z, lhip_vis  = [f"{PoseLandmark.LEFT_HIP.name}_{axis}" for axis in axes_with_vis]
    rhip_x, rhip_y, rhip_z, rhip_vis = [f"{PoseLandmark.RIGHT_HIP.name}_{axis}" for axis in axes_with_vis]
    
    base_x = (positions[lhip_x] + positions[rhip_x]) / 2
    base_y = (positions[lhip_y] + positions[rhip_y]) / 2
    base_z = (positions[lhip_z] + positions[rhip_z]) / 2
    base_vis = (positions[lhip_vis] + positions[rhip_vis]) / 2

    cols = ["base_x", "base_y", "base_z", "base_vis"]
    data = [base_x, base_y, base_z, base_vis]

    for landmark in get_pose_landmarks_present_in_dataframe(positions):
        cols = cols + [f"{landmark}_x", f"{landmark}_y", f"{landmark}_z", f"{landmark}_vis"]
        data.extend([
            positions[f"{landmark}_x"] - base_x,
            positions[f"{landmark}_y"] - base_y,
            positions[f"{landmark}_z"] - base_z,
            positions[f"{landmark}_vis"]
        ])
        
    positions_relative_to_hip = pd.concat(data, keys=cols, axis=1)
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
    
    # complexity_measures.plot(
        # title=f"{title} Accumulated Complexity",
    # )
    # plt.show(block=True)

    return {}

def get_visibility(data: pd.DataFrame, joint_names: t.List[str]):
    """Returns a dataframe with the visibility of each landmark."""
    vis_col_names = [joint_name + "_vis" for joint_name in joint_names]
    visibility_df = data[vis_col_names]
    # remove _viz from col names
    visibility_df.columns = [col_name[:-4] for col_name in visibility_df.columns]

    # replace any NaN with zero
    visibility_df = visibility_df.fillna(0)

    return visibility_df

def weigh_by_visiblity(data: pd.DataFrame, data_vis: pd.DataFrame, col_roots: t.List[str], col_suffixes: t.List[str]):
    """Weighs the data by visibility."""
    weighted_data = pd.DataFrame()

    # Get total visibilty of landmarks for each frame.
    visibility = data_vis[col_roots].sum(axis=1)

    for col_root in col_roots:
        for col_suffix in col_suffixes:
            col_name = f"{col_root}_{col_suffix}"
            weighted_data[col_name] = data[col_name] * data_vis[col_root] / visibility

    return weighted_data

def generate_dvajs_with_visibility(
    filepaths: t.Iterable[Path],
    landmarks: t.Iterable[PoseLandmark],
    include_base: bool = True,
):
    landmarks_to_use = [landmark.name for landmark in landmarks]
    if include_base:
            landmarks_to_use.append("base")

    for holistic_csv_file in filepaths:
        # warn if the file is not a holisticdata.csv file
        if not holistic_csv_file.name.endswith(".holisticdata.csv"):
            print(f"WARNING: {holistic_csv_file} is not a .holisticdata.csv file.", file=sys.stderr)
            continue
        data = pd.read_csv(holistic_csv_file, index_col='frame')
        relative_position = get_position_relative_to_base(data)
        
        dvaj = calc_scalar_dvaj(relative_position, landmarks_to_use)
        # distance_cols = [col for col in dvaj.columns if "distance" in col]
        # dvaj[distance_cols].plot(title=f"{holistic_csv_file.name} Distance")

        visibility = get_visibility(relative_position, landmarks_to_use)
        yield dvaj, visibility

if __name__ == "__main__":
    import argparse
    import sys
    import json
    plt.ioff()

    parser = argparse.ArgumentParser()
    parser.add_argument("--destdir", type=Path, default=Path.cwd())  
    parser.add_argument("--srcdir", type=Path, required=False)  
    parser.add_argument("--audiodata", type=Path, required=False)
    parser.add_argument("--noplot_figs", action="store_false", default=True)
    parser.add_argument("--complexity_summary_csv", type=Path, required=True)
    parser.add_argument("--measure_weighting", choices=[e.name for e in DvajMeasureWeighting], default=DvajMeasureWeighting.decreasing_by_quarter.name)
    parser.add_argument("--landmark_weighting", choices=[e.name for e in PoseLandmarkWeighting], default=PoseLandmarkWeighting.balanced.name)
    parser.add_argument("--noinclude_base", action="store_true", default=False)
    parser.add_argument("--weigh_by_visibility", action="store_false", default=True)
    parser.add_argument("files", nargs="*", type=Path)
    args = parser.parse_args()

    input_files: t.List[Path] = args.files.copy()
    relative_dirs: t.List[Path] = [f.parent for f in args.files]

    # if srcdir is specified, add all files of the form "*.holisticdata.csv" in that directory to the list of files.
    files_from_srcdir = []
    if args.srcdir is not None:
        files_from_srcdir = list(args.srcdir.rglob("*.holisticdata.csv"))
        input_files.extend(files_from_srcdir)
        relative_dirs.extend([args.srcdir for _ in files_from_srcdir])
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

    filename_stems = [file.stem.replace('.holisticdata', '') for file in input_files]
    relative_filename_stems = [
        str(file.relative_to(relative_dir).parent / file.stem.replace('.holisticdata', ''))
        for file, relative_dir 
        in zip(input_files, relative_dirs)
    ]

    measure_weighting_choice = DvajMeasureWeighting[args.measure_weighting]
    measure_weighting = measure_weighting_choice.get_weighting()

    landmark_weighting_choice = PoseLandmarkWeighting[args.landmark_weighting]
    landmark_weighting = landmark_weighting_choice.get_weighting()

    creation_method = f"mw-{measure_weighting_choice.name}_lmw-{landmark_weighting_choice.name}_{'byvisibility' if args.weigh_by_visibility else 'ignorevisibility'}"
    sup_title = creation_method

    debug_dir = args.destdir / "debug" / sup_title
    debug_dir.mkdir(parents=True, exist_ok=True)
    count_by_subpath = {}
    debug_file_count = 0
    def make_debug_path(name: str, subpath: str = "") -> Path:
        global debug_file_count
        debug_file_count += 1
        count_by_subpath[subpath] = count_by_subpath.get(subpath, 0) + 1
        dirpath = debug_dir
        prefix = f"{debug_file_count:04}"
        if len(subpath) > 0:
            dirpath = dirpath / subpath
            # prefix = f"{prefix}_subid{count_by_subpath[subpath]:04}"
        dirpath.mkdir(parents=True, exist_ok=True)
        subpath_stem = Path(subpath).stem
        final_path = dirpath / f"{prefix}_{subpath_stem}_{name}"
        return final_path
    
    def save_debug_fig(name: str, fn: t.Callable[[plt.Axes], t.Union[t.Any, None]], subpath: str = "", subtitle: t.Optional[str] = sup_title):
        fig, ax = plt.subplots()
        fig.set_size_inches(7.5, 5.0)

        fn(ax)
        # plt.legend(bbox_to_anchor=(1.05, 1.0), loc='upper left')

        # # max_legend_entries = 10
        # # legend = plt.gca().get_legend()
        # # if legend is not None:
        # #     if len(legend.texts) > max_legend_entries:
        # #         legend.texts[max_legend_entries - 1].set_text('...')
        # #     for text in legend.tests[max_legend_entries:]: # remove extra legend entries
        # #         text.set_visible(False)
        
        # plt.tight_layout()

        if subtitle is not None:
            plt.suptitle(subtitle, fontsize=8, y=0.99)

        save_path = make_debug_path(name, subpath)
        fig.savefig(str(save_path))
        plt.close(fig)

    audio_data = None
    if args.audiodata is not None:
        audio_data = pd.read_csv(args.audiodata, index_col=0)

    landmarks = [
        lm for lm in landmark_weighting.keys()
        if landmark_weighting.get(lm, 0) > 0
    ]
    landmark_names = [landmark.name for landmark in landmarks]
    if not args.noinclude_base:
        # base is a special landmark that is computed from the average of the hips.
        #  >> data is made relative to the base during preprocessing.
        landmark_names.append("base")

    print(f"Using measure weighting: {measure_weighting_choice.name}")
    print(f"Using landmark weighting: {landmark_weighting_choice.name}")
    print(f"Including base landmark: {'yes' if not args.noinclude_base else 'no'}")
    print(f"Weighing by visibility: {'yes' if args.weigh_by_visibility else 'no'}")

    # print("Preprocessing files...")

    start_time = time.time()

    def print_with_time(msg: str, **kwargs):
        print(f"[{time.time() - start_time: 6.2f}s]\t{msg} ", **kwargs)
    
    ##### Preprocess Steps:
    # 1. Calculate the dvaj by-frame for each file.
    # 2. Weigh by visibility (joint-by-joint)
    # 3. Convert to cumulative sum (accumulated complexity).
    # 4. Trim trailing frames beyond which cumulative sum doesn't change.
    # 5. Calculate normalization denominators for each metric, on a per-frame basis.
    print_with_time("Step 1: Calculating DVAJs...")
    dvaj_dfs, visibility_dfs = zip(*tqdm(generate_dvajs_with_visibility(input_files, landmarks, include_base=not args.noinclude_base), total=len(input_files)))
    
    if args.noplot_figs:
        print_with_time("\tPlotting raw DVAJs...")
        for i in trange(len(filename_stems)):
            save_debug_fig("generated_dvaj.png", lambda ax: dvaj_dfs[i].plot(title=f"Raw DVAJ ({filename_stems[i]})", ax=ax), subpath=relative_filename_stems[i])

    if args.weigh_by_visibility:
        dvaj_suffixes = [measure.name for measure in DVAJ]
        print_with_time("Step 2: Weighting by visibility...")
        dvaj_dfs = [weigh_by_visiblity(dvaj, visibility, landmark_names, dvaj_suffixes) for dvaj, visibility in tqdm(zip(dvaj_dfs, visibility_dfs), total=len(dvaj_dfs))]

        if args.noplot_figs:
            print_with_time("\tPlotting visibility-weighted DVAJs...")
            for i in trange(len(filename_stems)):
                save_debug_fig("visweighted_dvaj.png", lambda ax: dvaj_dfs[i].plot(title=f"Visibility-Weighted DVAJ ({filename_stems[i]})", ax=ax), subpath=relative_filename_stems[i])
    else:
        print_with_time("Step 2: Skipped (not weighting by visibility) ...")

    print_with_time("Step 3: Converting to cumulative sum...")
    dvaj_cumsum_dfs = [dvaj.cumsum() for dvaj in dvaj_dfs]
    # For any NaNs, fill with the last valid value (NaNs will appear when skeleton isn't tracked)
    dvaj_cumsum_dfs = [dvaj_cumsum.fillna(method="ffill") for dvaj_cumsum in dvaj_cumsum_dfs]
    if args.noplot_figs:
        print_with_time("\tPlotting cumulative DVAJs...")
        for i in trange(len(filename_stems)):
            save_debug_fig("cumsum_dvaj.png", lambda ax: dvaj_cumsum_dfs[i].plot(title=f"Cumulative DVAJ ({filename_stems[i]})", ax=ax), subpath=relative_filename_stems[i])
    del dvaj_dfs
    
    print_with_time("Step 4: Trimming trailing frames...")
    dvaj_cumsum_dfs, tossed_frames = t.cast(t.Tuple[t.List[pd.DataFrame], t.List[int]] , zip(*[
        trim_df_to_convergence(dvaj_cumsum) for dvaj_cumsum in dvaj_cumsum_dfs
    ]))
    nontossed_frame_counts = [df.shape[0] for df in dvaj_cumsum_dfs]
    # pd.DataFrame({
        # "trimmed_frames": [dvaj_cumsum.shape[0] for dvaj_cumsum in dvaj_cumsum_dfs],
        # "tossed_frames": tossed_frames,
        # }, index=filename_stems).to_csv(make_debug_path("tossed_frames.csv"))
    
    if args.noplot_figs:
        for measure in DVAJ:
            print_with_time(f"\tPlotting trimmed {measure.name}...")
            for i in trange(len(filename_stems)):
                df = dvaj_cumsum_dfs[i]
                measure_cols = [col for col in df.columns if measure.name in col]
                save_debug_fig(f"trimmed_dvaj_{measure.name}.png", lambda ax: df[measure_cols].plot(title=f"Trimmed {measure.name} ({filename_stems[0]})", ax=ax), subpath=relative_filename_stems[i])

    # Step 5.
    # Computes the normalization denominators for each metric, on a per-frame basis.
    #   - Doing this by frame is necessary because the number of frames in each file may differ,
    #     and we want to normalize each metric in a consistent, duration-independant way.
    print_with_time("Step 5: Calculating normalization denominators...")
    maxes_per_frame = pd.DataFrame({
        f"{landmark_name}_{measure.name}": [
            dvaj_cumsum[f"{landmark_name}_{measure.name}"].max() / dvaj_cumsum.shape[0]
            for dvaj_cumsum in dvaj_cumsum_dfs
        ]
        for landmark_name in landmark_names
        for measure in DVAJ
    },  index=filename_stems)
    # Can lookup the normalization denominator for a given metric with:
    #   max_vals.loc[f"{landmark_name}_{measure.name}"].
    max_vals = maxes_per_frame.max()
    max_vals_and_src = pd.concat([max_vals, maxes_per_frame.idxmax()], keys=["max", "src"], axis=1)
    maxes_per_frame.to_csv(make_debug_path("movement_per_frame.csv"))
    max_vals_and_src.to_csv(make_debug_path("max_vals.csv"))

    # Step 6 & 7.
    # 6. Normalize each metric by its max among the dataset, adjusted
    #      by the length of the dataframe.
    # 7. Aggregate the normalized metrics into a single complexity measure.
    print_with_time("Step 6 & 7: Normalizing & Aggregating metrics...")
    complexity_measures = [
        aggregate_accumulated_dvaj_by_measure(
            dvaj_cumsum,
            measure_weighting=measure_weighting,
            landmark_weighting=landmark_weighting,
        )
        for dvaj_cumsum in dvaj_cumsum_dfs
    ]
    overall_complexities = [
        complexity_measures[i].sum(axis=1)
        for i in range(len(complexity_measures))
    ]
    del dvaj_cumsum_dfs
    if args.noplot_figs:
        print_with_time("\tPlotting complexity measures...")
        for i in trange(len(filename_stems)):
            save_debug_fig(f"complexity_measures.png", lambda ax: complexity_measures[i].plot(title=f"Complexity Measures ({filename_stems[i]})", ax=ax), subpath=relative_filename_stems[i])
            save_debug_fig(f"overall_complexity.png", lambda ax: overall_complexities[i].plot(title=f"Overall Complexity ({filename_stems[i]})", ax=ax), subpath=relative_filename_stems[i])

    # Step 8.
    # Save results
    print_with_time("Step 8: Saving results...")
    overall_complexities_df = pd.concat(overall_complexities, axis=1)
    overall_complexities_df.columns = relative_filename_stems

    save_debug_fig(f"overall_complexities.png", lambda ax: overall_complexities_df.plot(title=f"Overall Complexity", ax=ax))
    overall_complexities_df.to_csv(make_debug_path("overall_complexities.csv"))

    update_data = pd.DataFrame({
        "stem": filename_stems,
        "frames": nontossed_frame_counts,
        "complexity_per_frame": [overall_complexities[i].iloc[-1] / nontossed_frame_counts[i] for i in range(len(filename_stems))], 
        "net_complexity": [overall_complexities[i].iloc[-1] for i in range(len(filename_stems))],
    },
        index=[
            relative_filename_stems,
            [creation_method for _ in filename_stems]
        ]
    )    
    update_data.index.names = ["path", "creation_method"]
    update_data.to_csv(make_debug_path("complexity_summary.csv"))
    

    existing_complexity_summary = None
    if args.complexity_summary_csv.exists():
        existing_complexity_summary = pd.read_csv(str(args.complexity_summary_csv), index_col=["path", "creation_method"])

        # Perform an upsert on the existing complexity summary
        # (combination of outer join and update)
        existing_complexity_summary = pd.concat([
            existing_complexity_summary[~existing_complexity_summary.index.isin(update_data.index)], 
            update_data
        ])
        
        existing_complexity_summary.update(update_data)
    else:
        existing_complexity_summary = update_data    

    existing_complexity_summary.to_csv(args.complexity_summary_csv, index=True, header=True)

    print_with_time("Finished.")