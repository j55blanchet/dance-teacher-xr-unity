from pathlib import Path
import pandas as pd
from ..dancetree.DanceTree import DanceTree, DanceTreeNode
from ..update_database import load_db
import typing as t

def find_complexity_df(clip_relative_path: Path,
    complexity_byfile_dir: Path = Path('data/complexities/byfile'),
    complexity_method: str = 'mw-decreasing_by_quarter_lmw-balanced_byvisibility_includebase'):

    if complexity_byfile_dir.parts[-1] != 'byfile':
        complexity_byfile_dir = complexity_byfile_dir / 'byfile'

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

        last_frame_with_complexity_change = frame_start
        if node.complexity > 0:
            # Find the last frame where the complexity changed
            for frame in range(frame_start, frame_end):
                if complexity.loc[frame] != complexity.loc[frame+1]:
                    last_frame_with_complexity_change = frame+1
        
        node.metrics['time_of_last_complexity_change'] = last_frame_with_complexity_change / fps

        for child in node.children:
            add_complexity_to_treenode(child)

    add_complexity_to_treenode(tree.root)

    return tree


def trim_dancenodes_with_zero_complexity(tree: DanceTree):
    def trim_dancenodes_with_zero_complexity_recursive(node: DanceTreeNode):
       
        # Trim end time to the last time the complexity changed
        node.end_time = node.metrics['time_of_last_complexity_change']

        # Pop any children that start after the end time (which will have 0 complexity)
        for childIndex in range(len(node.children)-1, -1, -1):
            child = node.children[childIndex]
            if child.start_time >= node.end_time:
                assert child.complexity <= 0
                node.children.pop(childIndex)

        # Recurse on children (adjust their times and pop zero-complexity nodes down the tree)
        for remainingChild in node.children:
            trim_dancenodes_with_zero_complexity_recursive(remainingChild)
            
    trim_dancenodes_with_zero_complexity_recursive(tree.root)

def add_complexities_to_dancetrees(
        tree_srcdir: Path,    
        complexity_srcdir: Path,
        database_path: Path,
        output_dir: Path,
        complexity_method: str = 'mw-decreasing_by_quarter_lmw-balanced_byvisibility_includebase',
        trim_zero_complexity: bool = True,
        get_print_prefix: t.Callable[[], str] = lambda: '',
    ):
    import json

    def print_with_prefix(*args, **kwargs):
        print(get_print_prefix(), *args, **kwargs)

    db = load_db(database_path)

    dance_tree_files = list(tree_srcdir.rglob('*.dancetree.json'))

    for i, dance_tree_file in enumerate(dance_tree_files):
        relative_filepath = dance_tree_file.relative_to(tree_srcdir)

        print_with_prefix(f'Processing {i+1}/{len(dance_tree_files)}: {relative_filepath.as_posix()}', end='')
        
        clip_relative_stem = relative_filepath.parent / relative_filepath.stem.replace('.dancetree', '')

        complexity = find_complexity_df(clip_relative_stem, complexity_srcdir, complexity_method)
        if complexity is None:
            print(' - no complexity found!')
            continue
        
        matching_db_entry = None
        if clip_relative_stem.as_posix() in db.index:
            matching_db_entry =  db.loc[clip_relative_stem.as_posix()].to_dict()
        if matching_db_entry is None:
            print(' - no database entry found!')
            continue

        
        tree_text = dance_tree_file.read_text()
        tree = json.loads(tree_text)
        tree = DanceTree.from_dict(tree)
        
        fps = matching_db_entry['fps']
        tree = add_complexity_to_dancetree(tree, complexity, fps)

        if trim_zero_complexity:
            trim_dancenodes_with_zero_complexity(tree)
            
        output_path = output_dir / relative_filepath
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open('w') as f2:
            json.dump(tree.to_dict(), f2, indent=2)

        print(' - done!')
    print_with_prefix(f'Done! Saved {len(dance_tree_files)} trees to {output_dir.as_posix()}')

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--tree_srcdir', type=Path, required=True)
    parser.add_argument('--complexity_srcdir', type=Path, required=True)
    parser.add_argument('--database_path', type=Path, required=True)
    parser.add_argument('--output_dir', type=Path, required=True)
    parser.add_argument('--complexity_method', type=str, default='mw-decreasing_by_quarter_lmw-balanced_byvisibility_includebase')
    parser.add_argument('--skip_trim_zero_complexity', action='store_true')
    args = parser.parse_args()

    add_complexities_to_dancetrees(
        tree_srcdir=args.tree_srcdir,
        complexity_srcdir=args.complexity_srcdir,
        database_path=args.database_path,
        output_dir=args.output_dir,
        trim_zero_complexity=not args.trim_zero_complexity,
        complexity_method=args.complexity_method,
    )