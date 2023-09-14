from collections import defaultdict
import typing as t
from pathlib import Path
import json
import shutil
from ..update_database import load_db
from .DanceTree import DanceTree, DanceTreeNode

from ..audio_analysis.perform_analysis import get_audio_analysis_filepath, get_audio_result_subdirectory, AudioAnalysisResult

def bundle_data(
    holistic_data_srcdir: Path,
    pose2d_data_srcdir: Path,
    dancetree_srcdir: Path,
    db_csv_path: Path,
    audio_results_dir: Path,
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
        if tree.clip_relativepath not in db.index:
            print_with_prefix(f'Warning: No database info for dancetree at: {tree.clip_relativepath}')
            continue
        db_info = db.loc[tree.clip_relativepath]
        if exclude_test and db_info['isTest']:
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

        print_with_prefix(f'Linking files for dancetree {i+1}/{len(dancetrees)}: {video_relativepath}')

        def linkFile(src_file_path: Path, dest_path: Path):
            if src_file_path.exists() and not dest_path.exists():
                print_with_prefix(f'\tLinking {dest_path.name}')
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                dest_path.symlink_to(src_file_path)

        def linkRelatedFile(srcpath_folder: Path, file_extension: str, bundle_folder: str, target_file_extension: t.Optional[str] = None):
            src_relative_path = tree.clip_relativepath + file_extension
            file_src_path = srcpath_folder / src_relative_path
            file_export_path = bundle_media_export_path / bundle_folder / src_relative_path
            if target_file_extension:
                file_export_path = file_export_path.with_suffix(target_file_extension)
            linkFile(file_src_path, file_export_path)

        linkFile(video_src_path, video_export_path)
        linkRelatedFile(holistic_data_srcdir, '.holisticdata.csv', 'holisticdata')
        linkRelatedFile(pose2d_data_srcdir, '.pose2d.csv', 'pose2d')
    
    dances = list(dances.values())

    print('Saving dance and dancetree json files...')
    for dance in dances:
        relativeStem = Path(dance['clipRelativeStem'])

        if "Charlene" in relativeStem.name:
            breakpoint()
            
        audio_analysis_dir = get_audio_result_subdirectory(audio_results_dir, result_type='analysis')
        audio_analysis_filepath = get_audio_analysis_filepath(audio_analysis_dir, relativeStem)
        if audio_analysis_filepath.exists():
            data = json.loads(audio_analysis_filepath.read_text(encoding='utf-8'))
            audio_analysis = AudioAnalysisResult.from_dict(data)
            dance['debugAudioAnalysis'] = data
            dance['all_beat_times'] = audio_analysis.tempo_info.all_beats
            dance['audible_beat_times'] = audio_analysis.tempo_info.audible_beats
            dance['bpm'] = audio_analysis.tempo_info.bpm
            dance['beat_offset'] = audio_analysis.tempo_info.beat_offset
        else:
            print_with_prefix(f'\tWarning: No audio analysis for {relativeStem}')

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
    parser.add_argument('--audio_results_dir', type=Path, required=True)
    parser.add_argument('--source_videos_dir', type=Path, required=True)
    parser.add_argument('--bundle_export_path', type=Path, required=True)
    parser.add_argument('--bundle_media_export_path', type=Path, required=True)
    parser.add_argument('--rename_mp4s_to_mp4v', action='store_true', default=False)
    parser.add_argument('--exclude_test', action='store_true', default=False)

    args = parser.parse_args()

    bundle_data(
        dancetree_srcdir=args.dancetree_srcdir,
        db_csv_path=args.db_csv_path,
        audio_results_dir=args.audio_results_dir,
        bundle_export_path=args.bundle_export_path,
        bundle_media_export_path=args.bundle_media_export_path,
        source_videos_dir=args.source_videos_dir,
        rename_mp4s_to_mp4v=args.rename_mp4s_to_mp4v,
        exclude_test=args.exclude_test,
    )

    print(f'Done! Saved bundle to {args.bundle_export_path.resolve().as_posix()}')