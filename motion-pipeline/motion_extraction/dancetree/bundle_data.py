from collections import defaultdict
import typing as t
from pathlib import Path
import json
import shutil
from ..update_database import load_db
from .DanceTree import DanceTree, DanceTreeNode


def bundle_data(
    holistic_data_srcdir: Path,
    pose2d_data_srcdir: Path,
    dancetree_srcdir: Path,
    db_csv_path: Path,
    bundle_export_path: Path,
    bundle_media_export_path: Path,
    source_videos_dir: Path,
    rename_mp4s_to_mp4v: bool,
    exclude_test: bool = True,
    print_prefix: t.Callable[[], str] = lambda: '',
):
    def print_with_prefix(*args, **kwargs):
        print(print_prefix(), *args, **kwargs)

    print_with_prefix('Loading database...')
    db = load_db(db_csv_path)
    
    dancetree_filepaths = list(dancetree_srcdir.rglob('*.dancetree.json'))
    dancetrees = [
        DanceTree.from_json(filepath.read_text(encoding='utf-8'))
        for filepath in dancetree_filepaths
    ]

    videos_export_dir = bundle_media_export_path / 'videos'
    videos_export_dir.mkdir(parents=True, exist_ok=True)

    dancetree_dict = defaultdict(list)
    dances = {}
    for i, tree in enumerate(dancetrees):
        db_info = db.loc[tree.clip_relativepath]
        if exclude_test and db_info['is_test']:
            continue

        dancetree_dict[tree.clip_relativepath].append(tree.to_dict())
        dances[tree.clip_relativepath] = db_info.to_dict()
        dances[tree.clip_relativepath]['clipRelativeStem'] = tree.clip_relativepath

        video_relativepath: str = db_info['clipPath']
        video_src_path = source_videos_dir / video_relativepath
        video_export_path = videos_export_dir / video_relativepath

        if rename_mp4s_to_mp4v and video_src_path.suffix.lower() == '.mp4':
            video_export_path = video_export_path.with_suffix('.mp4v')
            dances[tree.clip_relativepath]['clipPath'] = Path(video_relativepath).with_suffix('.mp4v').as_posix()

        if not video_export_path.exists():
            print_with_prefix(f'Copying video {i+1}/{len(dancetrees)}: {video_relativepath}')
            video_export_path.parent.mkdir(parents=True, exist_ok=True)
            video_export_path.symlink_to(video_src_path)

        def linkFiles(srcpath_folder: Path, file_extension: str, bundle_folder: str):
            src_relative_path = tree.clip_relativepath + file_extension
            file_src_path = srcpath_folder / src_relative_path
            file_export_path = bundle_media_export_path / bundle_folder / src_relative_path
            if file_src_path.exists() and not file_export_path.exists():
                print_with_prefix(f'Copying {file_extension} {i+1}/{len(dancetrees)}: {src_relative_path}')
                file_export_path.parent.mkdir(parents=True, exist_ok=True)
                file_export_path.symlink_to(file_src_path)

        linkFiles(holistic_data_srcdir, '.holisticdata.csv', 'holisticdata')
        linkFiles(pose2d_data_srcdir, '.pose2d.csv', 'pose2d')
    
    dances = list(dances.values())

    dances_export_path = bundle_export_path / 'dances.json'
    dancetrees_export_path = bundle_export_path / 'dancetrees.json'

    dances_export_path.parent.mkdir(parents=True, exist_ok=True)
    dances_export_path.write_text(json.dumps(dances, indent=2), encoding='utf-8')

    dancetrees_export_path.parent.mkdir(parents=True, exist_ok=True)
    dancetrees_export_path.write_text(json.dumps(dancetree_dict, indent=2), encoding='utf-8')
    print_with_prefix(f'Exported bundle with {len(dancetrees)} dancetrees to {bundle_export_path.resolve().as_posix()}')

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dancetree_srcdir', type=Path, required=True)
    parser.add_argument('--db_csv_path', type=Path, required=True)
    parser.add_argument('--source_videos_dir', type=Path, required=True)
    parser.add_argument('--bundle_export_path', type=Path, required=True)
    parser.add_argument('--bundle_media_export_path', type=Path, required=True)
    parser.add_argument('--rename_mp4s_to_mp4v', action='store_true', default=False)
    parser.add_argument('--exclude_test', action='store_true', default=False)

    args = parser.parse_args()

    bundle_data(
        dancetree_srcdir=args.dancetree_srcdir,
        db_csv_path=args.db_csv_path,
        bundle_export_path=args.bundle_export_path,
        bundle_media_export_path=args.bundle_media_export_path,
        source_videos_dir=args.source_videos_dir,
        rename_mp4s_to_mp4v=args.rename_mp4s_to_mp4v,
        exclude_test=args.exclude_test,
    )

    print(f'Done! Saved bundle to {args.bundle_export_path.resolve().as_posix()}')