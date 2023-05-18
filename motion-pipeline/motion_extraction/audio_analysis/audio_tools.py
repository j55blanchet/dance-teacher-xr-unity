import librosa
import numpy as np
import typing as t
import moviepy.editor as mpe
from pathlib import Path

def standardize_bpm_range(bpm_in: float, bpm_min: float = 80.0, bpm_max: float = 200.0) -> float:
    """
    Standardize the input BPM value to be within a specified range.

    If the input BPM value is less than the minimum BPM value, it is doubled until it is within the range.
    If the input BPM value is greater than the maximum BPM value, it is halved until it is within the range.

    Parameters:
    bpm_in (float): The input BPM value.
    bpm_min (float): The minimum BPM value allowed. Default is 80.0.
    bpm_max (float): The maximum BPM value allowed. Default is 160.0.

    Returns:
    The standardized BPM value within the specified range.
    """
    bpm = bpm_in
    while bpm < bpm_min:
        bpm *= 2
    while bpm > bpm_max:
        bpm /= 2
    return bpm


def calculate_8beat_segments(y: np.ndarray, sr: float, bpm: float, tempo_offset_samples: int) -> t.List[t.Tuple[int, int]]:
    """
    Calculate the starting and ending sample indices that divide the audio sample into 8-beat segments.

    Parameters:
    y (np.ndarray): The audio sample as a numpy array.
    sr (float): The sample rate of the audio sample.
    bpm (float): The tempo of the audio sample in beats per minute.
    tempo_offset_samples (int): The number of samples from the start of the audio sample to the first beat.

    Returns:
    A list of tuples representing the starting and ending sample indices of each 8-beat segment.
    """
    segment_frames: t.List[t.Tuple[int, int]] = []

    beats_per_bar = 8
    beats_per_second = bpm / 60
    samples_per_beat = sr / beats_per_second
    samples_per_segment = samples_per_beat * beats_per_bar
    seconds_per_segment = samples_per_segment / sr

    effective_start_index = 0
    start_index = tempo_offset_samples
    end_index = min(int(start_index + samples_per_segment), len(y))
    while end_index < len(y):
        segment_frames.append((effective_start_index, end_index))
        start_index = end_index
        effective_start_index = end_index
        end_index = min(int(start_index + samples_per_segment), len(y))

    return segment_frames


# def calculate_8beat_segments(y: np.ndarray, sr: float, bpm: float, start_beat: float): 
#     """ 
#     """
#     segment_frames: t.List[t.Tuple[int, int]] = []

#     samples_per_beat = sr * 60 / bpm
#     samples_beat_offset = int(start_beat * sr) % samples_per_beat
    


#     return segment_frames

def save_audio_from_video(video_path: Path, output_audio_path: Path, as_mono: bool = False):
    """
    Extract the audio track from a video file and save it as a separate audio file.

    Parameters:
    video_path (Path): The path to the video file.
    output_audio_path (Path): The path to save the audio file.
    as_mono (bool): Whether to convert the audio to mono (default: False).
    """
    # Create the output directory if it doesn't exist
    output_audio_path.parent.mkdir(parents=True, exist_ok=True)

    # Use MoviePy to extract the audio track from the video file
    with mpe.VideoFileClip(str(video_path)) as video_clip:
        audio_clip = video_clip.audio
        ffmpeg_params = []

        if as_mono:
            ffmpeg_params.extend(['-ac', '1'])

        audio_clip.write_audiofile( # type: ignore
            str(output_audio_path),
            ffmpeg_params=ffmpeg_params,
            verbose=False, 
            logger=None
        ) 

def load_audio(path: Path, as_mono: bool = False) -> t.Tuple[np.ndarray, float]:
    """
    Load the audio from a file and return the audio array and sampling rate.

    Parameters:
    path (str): The path to the input file.

    Returns:
    tuple: A tuple containing the audio array and sampling rate.
    """
    # Check if the file is a video file
    audio_array, sample_rate = None, None # type: ignore
    if path.suffix in ('.mp4', '.avi', '.mov'):
        # Load the video file
        video = mpe.VideoFileClip(str(path))

        if video.audio == None:
            raise Exception('No audio found in video file.')

        # Extract the audio from the video
        audio = video.audio

        if as_mono:
            audio.nchannels = 1
        
        # Convert the audio to a NumPy array
        audio_array: np.ndarray = audio.to_soundarray()

        # Get the sample rate of the audio
        sample_rate = float(audio.fps)

    # Otherwise, assume it's an audio file
    else:
        # Load the audio file with librosa
        audio_array, sample_rate = librosa.load(path, sr=None, mono=False)

        # Convert the audio to mono if it's stereo
        if as_mono and audio_array.ndim > 1:
            audio_array = np.mean(audio_array, axis=0)

    return audio_array, sample_rate