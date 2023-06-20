from collections import defaultdict
import typing as t
from pathlib import Path
import json

from ..update_database import load_db
from .DanceTree import DanceTree, DanceTreeNode


def bundle_data(
    dancetree_srcdir: Path,
    db_csv_path: Path,
    dances_export_path: Path,
    dancetrees_export_path: Path,
    exclude_test: bool = True,
):
    db = load_db(db_csv_path)
    
    dancetree_filepaths = list(dancetree_srcdir.rglob('*.dancetree.json'))
    dancetrees = [
        DanceTree.from_json(filepath.read_text(encoding='utf-8'))
        for filepath in dancetree_filepaths
    ]

    dancetree_dict = defaultdict(list)
    dances = {}
    for tree in dancetrees:
        dancetree_dict[tree.clip_relativepath].append(tree.to_dict())
        dances[tree.clip_relativepath] = db.loc[tree.clip_relativepath].to_dict()
        dances[tree.clip_relativepath]['clip_relativepath'] = tree.clip_relativepath
    
    dances = list(dances.values())

    dances_export_path.parent.mkdir(parents=True, exist_ok=True)
    dances_export_path.write_text(json.dumps(dances, indent=2), encoding='utf-8')

    dancetrees_export_path.parent.mkdir(parents=True, exist_ok=True)
    dancetrees_export_path.write_text(json.dumps(dancetree_dict, indent=2), encoding='utf-8')

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dancetree_srcdir', type=Path, required=True)
    parser.add_argument('--db_csv_path', type=Path, required=True)
    parser.add_argument('--dances_export_path', type=Path, required=True)
    parser.add_argument('--dancetrees_export_path', type=Path, required=True)
    parser.add_argument('--exclude_test', action='store_true', default=False)

    args = parser.parse_args()

    bundle_data(
        args.dancetree_srcdir,
        args.db_csv_path,
        args.dances_export_path,
        args.dancetrees_export_path,
        args.exclude_test,
    )

    print(f'Done! Saved dances to {args.dances_export_path.resolve().as_posix()} and trees to {args.dancetrees_export_path.resolve().as_posix()}')