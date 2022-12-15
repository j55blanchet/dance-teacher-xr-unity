"""
    This module is the entry point for the complexity analysis module.
"""
from typing import Collection
import pandas as pd
import mediapipe as mp
from pathlib import Path
from .complexityanalysis import calc_scalar_dvaj, calc_dvaj_metrics, DVAJ, plot_dvaj
import matplotlib.pyplot as plt

PoseLandmarks = mp.solutions.pose.PoseLandmark

def analyze_complexities(files: Collection[Path], landmarks: Collection[PoseLandmarks] = [PoseLandmarks.LEFT_WRIST, PoseLandmarks.RIGHT_WRIST]):

    if len(files) == 0:
        return

    
    data = pd.read_csv(files[0])
    dvaj = calc_scalar_dvaj(data, landmarks)
    metrics = calc_dvaj_metrics(dvaj)

    output = pd.DataFrame(
        columns=list(metrics.keys()), 
        data=[metrics], 
        index=[files[0].stem.replace('.holisticdata', '')]
    )

    for file in files[1:]:
        data = pd.read_csv(file)
        dvaj = calc_scalar_dvaj(data, landmarks)
        plt.savefig(file.with_suffix('.png'))
        metrics = calc_dvaj_metrics(dvaj)
        new_row = pd.DataFrame(
            columns=list(metrics.keys()), 
            data=[metrics], 
            index=[file.stem.replace('.holisticdata', '')]
        )

        

        output = pd.concat([output, new_row])
    
    wrist_cols = [key for key in metrics.keys() if key.lower().find('wrist') != -1]
    output.drop(wrist_cols, axis=1)

    return output

if __name__ == "__main__":
    import argparse
    import sys
    from pathlib import Path

    parser = argparse.ArgumentParser()
    parser.add_argument("--destination", type=Path, default=Path.cwd() / "metrics.csv")  
    parser.add_argument("--srcdir", type=Path, required=False)  
    parser.add_argument("files", nargs="*", type=Path)
    args = parser.parse_args()

    # if srcdir is specified, add all files of the form "*.holisticdata.csv" in that directory to the list of files.
    if args.srcdir is not None:
        args.files.extend(file for file in args.srcdir.glob("*.holisticdata.csv"))
    elif len(args.files) == 0:
        print("No files specified. Use --srcdir or specify files as arguments.")
        sys.exit(1)

    output = analyze_complexities(args.files)

    output.to_csv(args.destination, index=True)

    print('Metrics written to', args.destination)

    sys.exit(0)
