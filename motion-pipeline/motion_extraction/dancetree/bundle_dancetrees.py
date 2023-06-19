from collections import defaultdict
import typing as t
from pathlib import Path
import json

from ..update_database import load_db
from ..dancetree.DanceTree import DanceTree, DanceTreeNode


def bundle_export_dancetrees(
    dancetree_srcdir: Path,
    db_csv_path: Path,
    bundle_export_path: Path,
):
    db = load_db(db_csv_path)
    
    dancetree_filepaths = list(dancetree_srcdir.rglob('*.dancetree.json'))
    dancetrees = [
        DanceTree.from_json(filepath.read_text(encoding='utf-8'))
        for filepath in dancetree_filepaths
    ]

    bundle = defaultdict(lambda: {'trees': [], 'info': {}})
    for tree in dancetrees:
        bundle[tree.clip_relativepath]['trees'].append(tree.to_dict())
        bundle[tree.clip_relativepath]['info'] = db.loc[tree.clip_relativepath].to_dict()

    bundle_export_path.write_text(json.dumps(bundle, indent=None), encoding='utf-8')

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dancetree_srcdir', type=Path, required=True)
    parser.add_argument('--db_csv_path', type=Path, required=True)
    parser.add_argument('--bundle_export_path', type=Path, required=True)

    args = parser.parse_args()

    bundle_export_dancetrees(
        args.dancetree_srcdir,
        args.db_csv_path,
        args.bundle_export_path,
    )

    print(f'Done! Saved to {args.bundle_export_path.as_posix()}')