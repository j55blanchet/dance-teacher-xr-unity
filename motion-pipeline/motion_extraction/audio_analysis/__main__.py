import argparse
import json
import typing as t
from .audio_tools import calculate_8beat_segments, load_audio, save_audio_from_video
from .tempo_analysis import calculate_tempo_info, TempoInfo
from .spectral_analysis import calculate_spectral_contrast
from .similarity_analysis import calculate_cross_similarity, plot_cross_similarity
from pathlib import Path
from dataclasses import asdict
import numpy as np
import pandas as pd
import time
import psutil

ACCEPT_AUDIO_FILES = ['.mp3', '.wav', '.m4a', '.flac']
ACCEPT_VIDEO_FILES = ['.mp4', '.mov', '.avi', '.mkv']
ACCEPT_AUDIOVIDEO_FILES = ACCEPT_AUDIO_FILES + ACCEPT_VIDEO_FILES

def get_memory_usage() -> str:
    process = psutil.Process()
    memory_info = process.memory_info()
    memory_usage_MB = memory_info.rss / 1024 / 1024

    available_memory = psutil.virtual_memory().total
    available_memory_MB = available_memory / 1024 / 1024
    return f"{memory_usage_MB:,.2f} / {available_memory_MB:,.2f} MB"

def find_cached_audiofile(video_filepath: Path, input_dir_root: Path, cache_dir_root: Path, allowed_suffixes = ['.mp3', '.wav']) -> t.Union[Path, None]:
    relative_path = video_filepath.relative_to(input_dir_root)

    for suffix in allowed_suffixes:
        cached_audiofile = cache_dir_root / relative_path.with_suffix(suffix)
        if cached_audiofile.exists():
            return cached_audiofile
    
    return None

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Perform audio analysis on a directory of audio files.')
    parser.add_argument('--videosrcdir', type=Path, help='The directory containing the input video files.', required=False)
    parser.add_argument('--audiosrcdir', type=Path, help='The directory containing the input audio files.', required=False)
    parser.add_argument('--destdir', type=Path, help='The directory to output the analysis results.')
    parser.add_argument('--audiocachedir', type=Path, help='The directory to cache audio files in.')
    parser.add_argument('--analysis_summary_out', type=Path, help='The path to save the analysis summary.')
    args = parser.parse_args()

    # Get the paths of the audio or video files (search recursively)
    input_video_filepaths = []
    input_video_cached_audio_filepaths = []
    input_audio_filepaths = []
    if args.videosrcdir:
        for filepath in args.videosrcdir.rglob('*'):
            if filepath.suffix.lower() in ACCEPT_VIDEO_FILES:
                input_video_filepaths.append(filepath)
    if args.audiosrcdir:
        for filepath in args.audiosrcdir.rglob('*'):
            if filepath.suffix.lower() in ACCEPT_AUDIO_FILES:
                input_audio_filepaths.append(filepath)

    print(f"Found {len(input_video_filepaths)} input video files and {len(input_audio_filepaths)} input audio files.")

    start_time = time.time()
    def print_with_time(s: str, **kwargs):
        print(f"{time.time() - start_time:.2f}s:\t{get_memory_usage()}\t{s}", **kwargs)

    analysis_summary = []

    # Find or cache audio from each video file
    for i, filepath in enumerate(input_video_filepaths):
        print_with_time(f"Extracting cached audio {i+1}/{len(input_video_filepaths)}: {filepath}")

        # Check if the audio file has already been cached
        cached_audio_filepath = find_cached_audiofile(filepath, args.videosrcdir, args.audiocachedir)
        if cached_audio_filepath:
            print_with_time(f"\tFound cached audio file: {cached_audio_filepath.relative_to(args.audiocachedir)}")
        else:
            print_with_time(f"\tNo cached audio found. Extracting audio from video...", end='')
            # Extract the audio from the video file
            cached_audio_filepath = args.audiocachedir / filepath.relative_to(args.videosrcdir).with_suffix('.mp3')
            save_audio_from_video(filepath, cached_audio_filepath, as_mono=True)
            print(f'Done (saved to {cached_audio_filepath.relative_to(args.audiocachedir)})')

        input_video_cached_audio_filepaths.append(cached_audio_filepath)

    all_input_filepaths = input_audio_filepaths + input_video_filepaths
    all_input_audiopaths = input_audio_filepaths + input_video_cached_audio_filepaths
    input_types = ["audio"] * len(input_audio_filepaths) + ["video"] * len(input_video_filepaths)
    src_dirs = [args.audiosrcdir] * len(input_audio_filepaths) + [args.videosrcdir] * len(input_video_filepaths)

    for i, (filepath, audio_filepath, input_type, src_dir) in enumerate(zip(all_input_filepaths, all_input_audiopaths, input_types, src_dirs)):
        print_with_time(f"Analyzing audio from {i+1}/{len(all_input_filepaths)}: {filepath}")

        # Load the audio file
        audio_array, sample_rate = load_audio(audio_filepath, as_mono=True)

        # Calculate the tempo information
        tempo_info: TempoInfo = calculate_tempo_info(audio_array, sample_rate)
        starting_beat_sample = tempo_info.starting_beat_sample(sample_rate)

        # Create 8-bar segments
        eight_beat_segments = calculate_8beat_segments(audio_array, sample_rate, tempo_info.bpm, starting_beat_sample)
        eight_beat_segments_as_timestamps: t.List[t.Tuple[float, float]] = (np.array(eight_beat_segments) / sample_rate).tolist()

        cross_similarity  = calculate_cross_similarity(audio_array, sample_rate, eight_beat_segments_as_timestamps)
        fig, ax = plot_cross_similarity(cross_similarity)
        ax.set_title(f"{filepath.stem} Cross Similarity")
        similarity_dir = args.destdir / 'segmentsimilarity' / input_type
        similarity_dir.mkdir(parents=True, exist_ok=True)
        fig.savefig(similarity_dir / filepath.relative_to(src_dir).with_suffix('.png'))
        # spectal_contrast_matrix = calculate_spectral_contrast(audio_array, sample_rate, eight_beat_segments)
        
        analysis_result = {
            'sample_rate': sample_rate,
            'tempo_info': asdict(tempo_info),
            'eight_beat_segments': eight_beat_segments_as_timestamps, # Convert to list to make it JSON serializable
            'cross_similarity': cross_similarity.tolist(),
            # 'spectral_contrast': spectal_contrast_matrix.tolist()
        }

        analysis_summary.append(pd.Series({
            'start_beat': tempo_info.starting_beat_timestamp,
            'bpm': tempo_info.bpm,
            'type': input_type,
        }, name=filepath.stem)) # type: ignore

        # Save the tempo information (with same relative path as input file)
        destdir = args.destdir / 'analysis' / input_type
        destdir.mkdir(parents=True, exist_ok=True)
        output_file = destdir / filepath.relative_to(src_dir).with_suffix('.json')

        with open(output_file, 'w') as f:
            json.dump(analysis_result, f, indent=4)

    # Save the analysis summary
    args.analysis_summary_out.parent.mkdir(parents=True, exist_ok=True)
    summary_df = pd.concat(analysis_summary, axis=1).T
    summary_df.index.name = 'filename'
    summary_df.to_csv(str(args.analysis_summary_out))

    print_with_time("Finished")

if __name__ == '__main__':
    main()