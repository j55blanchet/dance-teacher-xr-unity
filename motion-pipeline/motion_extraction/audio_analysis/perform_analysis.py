from pathlib import Path
import typing as t
import psutil
import time
import json
import pandas as pd
from dataclasses import asdict

from . import AudioAnalysisResult, analyze_audio_file, create_dance_tree_from_audioanalysis
from .audio_tools import save_audio_from_video
from .similarity_analysis import plot_cross_similarity
import matplotlib.pyplot as plt



ACCEPT_AUDIO_FILES = ['.mp3', '.wav', '.m4a', '.flac']
ACCEPT_VIDEO_FILES = ['.mp4', '.mov', '.avi', '.mkv']
ACCEPT_AUDIOVIDEO_FILES = ACCEPT_AUDIO_FILES + ACCEPT_VIDEO_FILES

def find_cached_audiofile(video_filepath: Path, input_dir_root: Path, cache_dir_root: Path, allowed_suffixes = ['.mp3', '.wav']) -> t.Union[Path, None]:
    relative_path = video_filepath.relative_to(input_dir_root)

    for suffix in allowed_suffixes:
        cached_audiofile = cache_dir_root / relative_path.with_suffix(suffix)
        if cached_audiofile.exists():
            return cached_audiofile
    
    return None

def get_memory_usage() -> str:
    process = psutil.Process()
    memory_info = process.memory_info()
    memory_usage_MB = memory_info.rss / 1024 / 1024

    available_memory = psutil.virtual_memory().total
    available_memory_MB = available_memory / 1024 / 1024
    return f"{memory_usage_MB:,.2f} / {available_memory_MB:,.2f} MB"

def get_audio_result_dir(
    analysis_dir: Path,
    input_type: t.Literal['audio', 'video'],
    result_type: t.Literal['analysis', 'dancetrees', 'segmentsimilarity'],
):
    return analysis_dir / result_type / input_type

def perform_audio_analysis(
        videosrcdir: t.Optional[Path],
        audiosrcdir: t.Optional[Path],
        destdir: Path,
        audiocachedir: Path,
        analysis_summary_out: Path,
        include_mem_usage: bool = False,
        skip_existing: bool = False,
        print_prefix: t.Callable[[], str] = lambda: '',
):

    def print_with_prefix(s: str="", **kwargs):
        print(f"{print_prefix()}{s}", **kwargs)

    print_with_prefix(f"Running audio analysis...")

    # Get the paths of the audio or video files (search recursively)
    input_video_filepaths = []
    input_video_cached_audio_filepaths = []
    input_audio_filepaths = []
    if videosrcdir:
        for filepath in videosrcdir.rglob('*'):
            if filepath.suffix.lower() in ACCEPT_VIDEO_FILES:
                input_video_filepaths.append(filepath)
    if audiosrcdir:
        for filepath in audiosrcdir.rglob('*'):
            if filepath.suffix.lower() in ACCEPT_AUDIO_FILES:
                input_audio_filepaths.append(filepath)

    print(f"Found {len(input_video_filepaths)} input video files and {len(input_audio_filepaths)} input audio files.")

    start_time = time.time()
    def print_with_time(s: str, **kwargs):
        mem_usage_str = f'{get_memory_usage()}\t' if include_mem_usage else ''
        print_with_prefix(f"{time.time() - start_time:.2f}s:\t{mem_usage_str}{s}", **kwargs)

    analysis_summary = []

    # Find or cache audio from each video file
    if videosrcdir:
        print_with_time('Caching audio from video files...')
        for i, filepath in enumerate(input_video_filepaths):
            relative_filepath = filepath.relative_to(videosrcdir)
            # print_with_time(f"Extracting cached audio {i+1}/{len(input_video_filepaths)}: {relative_filepath}")
            print_with_time(f"\t{i+1}/{len(input_video_filepaths)} ", end='')

            # Check if the audio file has already been cached
            cached_audio_filepath = find_cached_audiofile(filepath, videosrcdir, audiocachedir)
            if cached_audio_filepath:
                print(f"\tFound cached audio: {cached_audio_filepath.relative_to(audiocachedir)}")
            else:
                print(f"\tExtracting audio from video --> ", end='')
                # Extract the audio from the video file
                cached_audio_filepath = audiocachedir / filepath.relative_to(videosrcdir).with_suffix('.mp3')
                save_audio_from_video(filepath, cached_audio_filepath, as_mono=True)
                print(f'{cached_audio_filepath.relative_to(audiocachedir)})')

            input_video_cached_audio_filepaths.append(cached_audio_filepath)

    all_input_filepaths = input_audio_filepaths + input_video_filepaths
    all_input_audiopaths = input_audio_filepaths + input_video_cached_audio_filepaths
    input_types: t.List[t.Literal["audio", "video"]] = ["audio"] * len(input_audio_filepaths) + ["video"] * len(input_video_filepaths) # type: ignore
    src_dirs = [audiosrcdir] * len(input_audio_filepaths) + [videosrcdir] * len(input_video_filepaths)

    print_with_time('Analyzing audio...')
    for i, (filepath, audio_filepath, input_type, src_dir) in enumerate(zip(all_input_filepaths, all_input_audiopaths, input_types, src_dirs)):

        relative_filepath = filepath.relative_to(src_dir)

        # Save the analysis information (with same relative path as input file)
        analysis_destdir = get_audio_result_dir(destdir, input_type, 'analysis')
        output_file = analysis_destdir / relative_filepath.with_suffix('.json')
        
        analysis_result = None
        already_exists = False
        if skip_existing and output_file.exists():
            print_with_time(f"    {i+1}/{len(all_input_filepaths)} [{input_type} src] Exists: {output_file.relative_to(destdir)}")
            analysis_result = AudioAnalysisResult.from_dict(json.load(open(output_file)))
            already_exists = True
        else:
            print_with_time(f"    {i+1}/{len(all_input_filepaths)} [{input_type} src] Analyzing: {relative_filepath}")
            analysis_result = analyze_audio_file(audio_filepath)

            output_file.parent.mkdir(parents=True, exist_ok=True)
            with open(output_file, 'w') as f:
                json.dump(analysis_result.to_dict(), f, indent=4)

        if not already_exists:
            # Plot cross similarity matrix
            fig, ax = plot_cross_similarity(analysis_result.cross_similarity)
            ax.set_title(f"{filepath.stem} Cross Similarity")
            similarity_dir = get_audio_result_dir(destdir, input_type, 'segmentsimilarity')
            similarity_dir.mkdir(parents=True, exist_ok=True)
            figpath = similarity_dir / relative_filepath.with_suffix('.png')
            figpath.parent.mkdir(parents=True, exist_ok=True)
            fig.savefig(figpath)
            plt.close(fig)

        if not already_exists:
            # Create dance trees
            dance_tree = create_dance_tree_from_audioanalysis(
                tree_name=filepath.stem + " audio tree",
                clip_relativepath=relative_filepath.with_suffix('').as_posix(),
                analysis=analysis_result
            )
            dance_tree_dir = get_audio_result_dir(destdir, input_type, 'dancetrees')
            dance_tree_filepath = dance_tree_dir / relative_filepath.with_suffix('.dancetree.json')
            dance_tree_filepath.parent.mkdir(parents=True, exist_ok=True)
            with dance_tree_filepath.open('w') as f:
                json.dump(dance_tree.to_dict(), f, indent=4) # type: ignore

        # Append summary data (for the CSV file)
        analysis_summary.append(pd.Series({
            'start_beat': analysis_result.tempo_info.starting_beat_timestamp,
            'bpm': analysis_result.tempo_info.bpm,
            'type': input_type,
        }, name=filepath.stem)) # type: ignore

    # Save the analysis summary
    analysis_summary_out.parent.mkdir(parents=True, exist_ok=True)
    summary_df = pd.concat(analysis_summary, axis=1).T
    summary_df.index.name = 'filename'
    summary_df.to_csv(str(analysis_summary_out))

    print_with_time("Finished")