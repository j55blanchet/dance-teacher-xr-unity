from pathlib import Path
import pandas as pd
from ..dancetree.DanceTree import DanceTree, DanceTreeNode

def find_complexity_df(clip_relative_path: Path,
    complexity_byfile_dir: Path = Path('data/complexities/byfile'),
    complexity_method: str = 'mw-decreasing_by_quarter_lmw-balanced_byvisibility_includebase'):

    complexity_path = complexity_byfile_dir / clip_relative_path.with_suffix('.complexity.csv')
    if not complexity_path.exists():
        return None

    data = pd.read_csv(complexity_path, index_col=0)
    if complexity_method not in data.columns:
        return None

    return data[complexity_method]

def add_complexity_to_dancetree(
        tree: DanceTree,    
        complexity: pd.Series,
        fps: float,
    ):
    
    if tree.generation_data == None:
        tree.generation_data = {}
    
    tree.generation_data['complexity'] = complexity.name

    def add_complexity_to_treenode(node: DanceTreeNode):
        target_frame_end = node.end_time * fps
        target_frame_start = node.start_time * fps

        frame_end = complexity.index.get_indexer([target_frame_end], method='nearest')[0]
        frame_start = complexity.index.get_indexer([target_frame_start], method='nearest')[0]
        
        node.complexity = complexity.loc[frame_end] - complexity.loc[frame_start]
        # replace NaNs with 0
        if pd.isna(node.complexity):
            node.complexity = 0

        for child in node.children:
            add_complexity_to_treenode(child)

    add_complexity_to_treenode(tree.root)
    return tree


def add_complexities_to_dancetrees(
        tree_srcdir: Path,    
        complexity_srcdir: Path,
        database_path: Path,
        output_dir: Path,
        complexity_method: str = 'mw-decreasing_by_quarter_lmw-balanced_byvisibility_includebase',
    ):
    import json

    db = []
    with database_path.open('r') as f:
        db: list = json.load(f)
    

    dance_tree_files = list(tree_srcdir.rglob('*.dancetree.json'))

    for i, dance_tree_file in enumerate(dance_tree_files):
        relative_filepath = dance_tree_file.relative_to(tree_srcdir)

        print(f'Processing {i+1}/{len(dance_tree_files)}: {dance_tree_file.as_posix()}', end='')
        
        clip_relative_path = relative_filepath.parent / relative_filepath.stem.replace('.dancetree', '')

        complexity = find_complexity_df(clip_relative_path, complexity_srcdir, complexity_method)
        if complexity is None:
            print(' - no complexity found!')
            continue
        
        matching_db_entry =  next((entry for entry in db if entry.get('clipRelativeStem', None)==clip_relative_path.as_posix()), None)
        if matching_db_entry is None:
            print(' - no database entry found!')
            continue

        tree = None
        with dance_tree_file.open('r+') as f:
            tree = DanceTree.from_dict(json.load(f))    

        fps = matching_db_entry['fps']
        tree = add_complexity_to_dancetree(tree, complexity, fps)
            
        output_path = output_dir / relative_filepath
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open('w') as f2:
            json.dump(tree.to_dict(), f2, indent=2)

        print(' - done!')


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--tree_srcdir', type=Path, required=True)
    parser.add_argument('--complexity_srcdir', type=Path, required=True)
    parser.add_argument('--database_path', type=Path, required=True)
    parser.add_argument('--output_dir', type=Path, required=True)
    parser.add_argument('--complexity_method', type=str, default='mw-decreasing_by_quarter_lmw-balanced_byvisibility_includebase')
    args = parser.parse_args()

    add_complexities_to_dancetrees(
        args.tree_srcdir,
        args.complexity_srcdir,
        args.database_path,
        args.output_dir,
        args.complexity_method,
    )