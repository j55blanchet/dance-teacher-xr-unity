import librosa
import numpy as np
import typing as t
import moviepy.editor as mpe
from pathlib import Path

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

    beats_per_bar = 1 # 8
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

def save_audio_from_video(video_path: Path, output_audio_path: Path):
    """
    Extract the audio track from a video file and save it as a separate audio file.

    Parameters:
    video_path (Path): The path to the video file.
    audio_path (Path): The path to save the audio file.

    Returns:
    None
    """
    # Create the output directory if it doesn't exist
    output_audio_path.parent.mkdir(parents=True, exist_ok=True)

    # Use MoviePy to extract the audio track from the video file
    with mpe.VideoFileClip(str(video_path)) as video_clip:
        audio_clip = video_clip.audio
        audio_clip.write_audiofile(str(output_audio_path), verbose=False, logger=None) # type: ignore

def load_audio(path: Path):
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

        # Convert the audio to a NumPy array
        audio_array: np.ndarray = audio.to_soundarray()

        # Get the sample rate of the audio
        sample_rate = float(audio.fps)

    # Otherwise, assume it's an audio file
    else:
        # Load the audio file with librosa
        audio_array, sample_rate = librosa.load(path, sr=None, mono=False)

        # Convert the audio to mono if it's stereo
        if audio_array.ndim > 1:
            audio_array = np.mean(audio_array, axis=0)

    return audio_array, sample_rate