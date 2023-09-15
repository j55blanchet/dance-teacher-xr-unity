from collections import defaultdict
import typing as t
from pathlib import Path
import json
import shutil
from ..update_database import load_db
from .DanceTree import DanceTree, DanceTreeNode

from ..audio_analysis.perform_analysis import get_audio_analysis_filepath, get_audio_result_subdirectory, AudioAnalysisResult

def bundle_dance_data_as_json(
    dancetree_srcdir: Path,
    db_csv_path: Path,
    audio_results_dir: Path,
    bundle_export_path: Path,
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
    
    dances = list(dances.values())

    print_with_prefix('Saving dance and dancetree json files...')
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
    parser.add_argument('--bundle_export_path', type=Path, required=True)
    parser.add_argument('--exclude_test', action='store_true', default=False)

    args = parser.parse_args()

    bundle_dance_data_as_json(
        dancetree_srcdir=args.dancetree_srcdir,
        db_csv_path=args.db_csv_path,
        audio_results_dir=args.audio_results_dir,
        bundle_export_path=args.bundle_export_path,
        exclude_test=args.exclude_test,
    )

    print(f'Done! Saved bundle to {args.bundle_export_path.resolve().as_posix()}')