from pathlib import Path
import pandas as pd
from ..dancetree.DanceTree import DanceTree



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
    ):
    
    return tree