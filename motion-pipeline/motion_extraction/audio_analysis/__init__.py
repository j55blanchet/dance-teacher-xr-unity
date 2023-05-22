import dataclasses as dc
import dataclasses_json as dcj
import typing as t
import numpy as np
from pathlib import Path
from .audio_tools import calculate_8beat_segments_with_midpoints, load_audio, save_audio_from_video
from .tempo_analysis import TempoInfo, calculate_tempo_info
from .similarity_analysis import calculate_cross_similarity
from ..dancetree import DanceTree, DanceTreeNode

@dcj.dataclass_json
@dc.dataclass
class AudioAnalysisResult:
        duration: float
        sample_rate: int
        tempo_info: TempoInfo
        eight_beat_segments: t.List[t.List[float]]
        cross_similarity: t.List[t.List[float]]

def analyze_audio_file(filepath: Path) -> AudioAnalysisResult:
    # Load the audio file
    audio_array, sample_rate = load_audio(filepath, as_mono=True)
    return analyze_audio(audio_array, sample_rate)

def analyze_audio(audio_array: np.ndarray, sample_rate: int) -> AudioAnalysisResult:
    
    # Calculate the tempo information.
    tempo_info: TempoInfo = calculate_tempo_info(audio_array, sample_rate)

    duration = len(audio_array) / sample_rate

    # Create 8-bar segments.
    eight_beat_segments_with_midpoints = list(calculate_8beat_segments_with_midpoints(tempo_info.bpm, tempo_info.starting_beat_timestamp, duration))
    eight_beat_segments = [(times[0], times[-1]) for times in eight_beat_segments_with_midpoints]

    # Compute similarity of 8-bar segments.
    cross_similarity  = calculate_cross_similarity(audio_array, sample_rate, eight_beat_segments)
    
    return AudioAnalysisResult(
        duration=duration,
        sample_rate=sample_rate,
        tempo_info=tempo_info,
        eight_beat_segments=eight_beat_segments_with_midpoints,
        cross_similarity=cross_similarity.tolist()
    )

def create_dance_tree_from_audioanalysis(tree_name: str, dance_name: str, analysis: AudioAnalysisResult) -> DanceTree:
    return DanceTree(
         tree_name=tree_name,
         dance_name=dance_name,
         bpm=analysis.tempo_info.bpm,
         first_beat=analysis.tempo_info.starting_beat_timestamp,
        root=DanceTreeNode(
            id='wholesong',
            start_time=0,
            end_time=analysis.duration,
            children=[DanceTreeNode(
                id=f"phrase{seg_i}",
                start_time=segment_timestamps[0],
                end_time=segment_timestamps[-1],
                metrics={
                    f'similarity-to-phrase{j}': analysis.cross_similarity[seg_i][j]
                    for j in range(len(analysis.cross_similarity[seg_i]))
                },
                events={},
                children=[
                    DanceTreeNode(
                        id=f"phrase{seg_i}-bar{bar_i}",
                        start_time=bar_start,
                        end_time=bar_end,
                    )
                    for bar_i, (bar_start, bar_end) in enumerate(zip(segment_timestamps[:-1], segment_timestamps[1:]))
                ],
            ) for seg_i, segment_timestamps in enumerate(analysis.eight_beat_segments)]
        )
    )