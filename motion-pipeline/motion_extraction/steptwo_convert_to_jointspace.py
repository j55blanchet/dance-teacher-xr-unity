
from typing import Optional
import pandas as pd
from pytransform3d import rotations as pr
from pytransform3d import transformations as pt
from pytransform3d.transform_manager import TransformManager
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

from .MecanimHumanoid import HumanoidPositionSkeleton
from .motion_output_provider import MotionOutputProvider, BVHOutputProvider, NaoTrajectoryOutputProvider

 




def convert_to_jointspace(holistic_data: pd.DataFrame, naocsv_outpath: Path, bvh_filepath: Path, bvhcsv_outpath: Optional[Path] = None, frame_limit = -1) -> None:
    """
    Concert the holistic data to jointspace and output to bvh file and robot trajectory
    """

    print("Calculating humanoid position skeletons...")
    METERS_TO_CM = 100.
    max_frames = frame_limit if frame_limit > 0 else len(holistic_data)
    skels = [HumanoidPositionSkeleton.from_mp_pose(row) for _, row in holistic_data.iloc[:max_frames].iterrows()]
    link_lengths = pd.DataFrame(s.get_offsets_and_measurements() for s in skels)    
    avg_offsets_and_measurements = link_lengths.mean(axis=0)
    avg_offsets_and_measurements_cm = avg_offsets_and_measurements * METERS_TO_CM
    print(avg_offsets_and_measurements_cm)

    print("\nConverting to jointspace...")
    bvh_output_provider = BVHOutputProvider(
        avg_offsets_and_measurements_cm,
        bvh_filepath,
        bvhcsv_outpath
    )
    nao_output_provider = NaoTrajectoryOutputProvider(
        naocsv_outpath,
    )

    for skel in skels[:max_frames]:     
        tfs = skel.get_transforms(plot=False)   
        nao_output_provider.process_frame(skel, tfs)
        bvh_output_provider.process_frame(skel, tfs) 
           
    print("\nWriting output...")
    bvh_output_provider.write_output()
    nao_output_provider.write_output()

    print("\nDone!")

if __name__ == "__main__":
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser()
    parser.add_argument('--bvh_output_folder', type=Path, required=True)
    parser.add_argument('--naocsv_output_folder', type=Path, required=True)
    parser.add_argument('holistic_data', nargs="+", type=Path)
    parser.add_argument('--log_level', type=str, default='INFO')
    parser.add_argument('--frame_limit', type=int, default=-1)
    parser.add_argument('--csv_output_folder', type=Path, default=None)
    args = parser.parse_args()

    args.bvh_output_folder.mkdir(exist_ok=True, parents=True)
    args.naocsv_output_folder.mkdir(exist_ok=True, parents=True)
    if args.csv_output_folder is not None:
        args.csv_output_folder.mkdir(exist_ok=True, parents=True)

    for holistic_data in args.holistic_data:
        glob_data = holistic_data.parent.glob(holistic_data.name)
        for data_file in glob_data:
            with data_file.open('r') as f:
                holistic_dataframe = pd.read_csv(f, index_col='frame')
                naocsv_outpath = args.naocsv_output_folder / data_file.stem.replace('.holisticdata', '.nao.csv')
                bvh_out_path = args.bvh_output_folder / data_file.stem.replace('.holisticdata', '.bvh')
                csv_out_path = args.csv_output_folder / data_file.stem.replace('.holisticdata', '.bvh.csv') if args.csv_output_folder is not None else None
                # out_path = args.output_folder / data_file.name.replace('.holisticdata', '.jointspace')
                convert_to_jointspace(holistic_dataframe, naocsv_outpath, bvh_out_path, bvhcsv_outpath = csv_out_path, frame_limit = args.frame_limit)
                print(f"Converted {data_file} to {bvh_out_path}")


