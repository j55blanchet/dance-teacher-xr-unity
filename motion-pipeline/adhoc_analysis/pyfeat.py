from pathlib import Path
from feat import Detector

def detect_emotions(video_path: Path, out_csv_path: Path, detector: Detector, overwrite: bool = False):
    if out_csv_path.exists() and not overwrite:
        print(f'\tOutput file {out_csv_path} already exists, skipping')
        return
    

    video_prediction = detector.predict_video(video_path)
    out_csv_path.parent.mkdir(parents=True, exist_ok=True)
    video_prediction.to_csv(str(out_csv_path), index=True)


def detect_emotionsdir(srcdir: Path, destdir: Path, overwrite: bool = False):

    face_model = "retinaface"
    landmark_model = "mobilenet"
    au_model = "xgb" # "rf"
    emotion_model = "resmasknet"
    expression_detector = Detector(
        face_model = face_model, 
        landmark_model = landmark_model, 
        au_model = au_model, 
        emotion_model = emotion_model
    )

    # expression_detector = Detector(
    #     face_model='faceboxes',
    #     landmark_model='mobilenet',
    #     au_model='xgb',
    #     emotion_model='resmasknet',
    #     facepose_model='img2pose',
    #     device='cuda'
    # )
    files = list(srcdir.rglob('*.mp4'))
    for i, video_path in enumerate(files):
        print(f'Processing video {i+1}/{len(files)}: {video_path}')
        out_csv_path = destdir / video_path.relative_to(srcdir).with_suffix('.csv')
        detect_emotions(video_path, out_csv_path, expression_detector, overwrite=overwrite)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--srcdir', type=Path, required=True)
    parser.add_argument('--destdir', type=Path, required=True)
    parser.add_argument('--overwrite', action='store_true', default=False)
    args = parser.parse_args()

    detect_emotionsdir(args.srcdir, args.destdir, overwrite=args.overwrite)
    