#%%

import matplotlib.pyplot as plt
import pandas as pd
import typing as t
import numpy as np
from perlin_noise import PerlinNoise

plt.style.use('ggplot')


# %%
# Create sample data
# Reference: https://github.com/salaxieb/perlin_noise

def make_noise_func():
    import random
    import sys
    makeseed = lambda: random.randint(0, sys.maxsize)
    noise_octive_start = 1
    noise_octive_levels = 4
    noises = [
        PerlinNoise(octaves=noise_octive_start*(2**i), seed=makeseed())
        for i in range(noise_octive_start, noise_octive_start + noise_octive_levels)
    ]
    get_noise = lambda x: sum([noise(x) / (1.75**i) for i, noise in enumerate(noises)])
    return get_noise

get_noise = make_noise_func()

secs = 10.

fps = 60.
bpm = 92.
beats_per_frame = bpm / 60. / fps
beats_per_bar = 4
frames_per_beat = 1. / beats_per_frame
frames_per_bar = frames_per_beat * beats_per_bar

frames = int(secs * fps)
total_beats = frames / frames_per_beat
total_bars  = frames / frames_per_bar

target_complexity = 10.

def make_complexity(noisefunc=get_noise):
    return np.abs(np.array([noisefunc(i / frames) for i in range(frames)])).cumsum()
complexity = make_complexity()

# %%
# Show example plot of complexity by body part

def get_dvaj():
    data = make_complexity()
    
    vel = abs(np.diff(data))
    accel = abs(np.diff(vel))
    jerk = abs(np.diff(accel))
    return data, vel, accel, jerk

dvaj = get_dvaj()


def plot_complexity_by_metric():
    data, vel, accel, jerk = dvaj
    plt.plot(data, label="Displacement")
    plt.plot(vel, label="Velocity")
    plt.plot(accel, label="Acceleration")
    plt.plot(jerk, label="Jerk")
    
    plt.xlabel(f"Frame")
    plt.ylabel(f"Raw Value")
    plt.legend()
    plt.title("Raw complexity by metric (example) - LWrist")

def plot_complexity_by_metric_cum():
    data, vel, accel, jerk = dvaj
    plt.plot(data.cumsum(), label="Displacement")
    plt.plot(vel.cumsum(), label="Velocity")
    plt.plot(accel.cumsum(), label="Acceleration")
    plt.plot(jerk.cumsum(), label="Jerk")
    
    plt.xlabel(f"Frame")
    plt.ylabel(f"Cumulative Sum")
    plt.legend()
    plt.title("Cumulative complexity by metric (example) - LWrist")

def plot_complexity_by_metric_normalized():
    data, vel, accel, jerk = dvaj
    data, vel, accel, jerk = data.cumsum(), vel.cumsum(), accel.cumsum(), jerk.cumsum()

    plt.plot(data / data.max(), label="Displacement")
    plt.plot(vel / vel.max(), label="Velocity")
    plt.plot(accel / accel.max(), label="Acceleration")
    plt.plot(jerk / jerk.max(), label="Jerk")
    
    plt.xlabel(f"Frame")
    plt.ylabel(f"Cumulative Sum (normalized)")
    plt.legend()
    plt.title(f"Cumulative Sum by metric (example, normalized) - LWrist")

plot_complexity_by_metric()
plt.show()

plot_complexity_by_metric_cum()
plt.show()

plot_complexity_by_metric_normalized()
plt.show()

bodypartscales = [
    ("Head", 0.4),
    ("Torso", 0.2),
    ("LWrist", 1.0),
    ("RWrist", 1.0),
    ("LLeg", 0.6),
    ("RLeg", 0.6),
]

def plot_body_part_complexity():
    all_data = []
    for bodypart, scale in bodypartscales:
        complexity = make_complexity(make_noise_func()) * scale
        all_data.append(complexity)
        plt.plot(complexity * scale, label=bodypart)
    plt.xlabel(f"Frame")
    plt.ylabel(f"Accumulated Complexity")
    plt.title("Accumulated complexity by body part (example)")
    plt.legend()
    plt.show()

    # Now, normalize each body part's complexity by its max
    all_data = np.array(all_data)
    all_data = all_data / all_data.max(axis=1)[:, None]
    for bodypart, data in zip([bp for bp, _ in bodypartscales], all_data):
        plt.plot(data, label=bodypart)
    plt.xlabel(f"Frame")
    plt.ylabel(f"Accumulated Complexity (normalized)")
    plt.title("Accumulated complexity by body part (example, normalized)")
    plt.legend()
    plt.show()
plot_body_part_complexity()

# %%

def plot_complexity():
    complexity_line, = plt.plot(complexity, label="Complexity")
    plt.xlabel(f"Frame")
    plt.ylabel(f"Accumulated Complexity")
    return complexity_line

plot_complexity()
plt.title("Accumulated complexity over time")
plt.show()

def plot_beat_snap_lines():
    plt.xlabel(f"Frame\n{fps} fps, {bpm} bpm, {beats_per_bar} beats / bar")
    plt.xticks([])


    for beat in range(int(total_beats)):
        plt.axvline(x=(1 + beat) * frames_per_beat, color="gray", alpha=0.5)
    for bar in range(int(total_bars)):
        plt.axvline(x=(1 + bar) * frames_per_bar, color="black", alpha=0.5)

def plot_complexity_target_lines():
    plt.ylabel(f"Accumulated Complexity\n({target_complexity} target per segment)")
    plt.yticks([])

    complexity_max = complexity.max()
    for target in np.arange(0, complexity_max, target_complexity):
        plt.axhline(y=target, color="darkorange", alpha=0.5)

plot_complexity()
plot_complexity_target_lines()
plt.title("Desired complexity per segment")


#%%

def plot_segments(indices, **kwargs):
    y = complexity[indices]
    plt.plot(indices, y, "o", **kwargs)
    plt.legend()

def segment_array_basic(data, segment_y_delta):
    indices = []
    cum_delta = 0
    for i in range(1, len(data)):
        cum_delta += data[i] - data[i-1]
        if cum_delta >= segment_y_delta:
            indices.append(i)
            cum_delta = 0  # Reset the cumulative delta
    return indices

unsnapped_division_indices = segment_array_basic(complexity, target_complexity)
cline = plot_complexity()
plot_complexity_target_lines()
plot_segments(unsnapped_division_indices, color=cline.get_color(), label="Naïve divisions")
plt.title("Segmented based on complexity")
plt.show()


cline = plot_complexity()
plot_complexity_target_lines()
plot_beat_snap_lines()
plot_segments(unsnapped_division_indices, color=cline.get_color(), label="Naïve divisions")
plt.title("Segmented based on complexity (desired snap lines)")
plt.show()

# %%
def segment_array_to_music(data, segment_y_delta, fps, bpm, beats_per_bar):
    # Calculate frames per beat and per bar
    frames_per_beat = fps * 60 / bpm
    frames_per_bar = frames_per_beat * beats_per_bar

    # Function to find the nearest index that aligns to a musical boundary
    def find_nearest_boundary(i, frames_per_boundary):
        return np.round(i / frames_per_boundary) * frames_per_boundary

    indices = []
    cum_delta = 0
    for i in range(1, len(data)):
        cum_delta += data[i] - data[i-1]
        if cum_delta >= segment_y_delta:
            # Try to align to a bar
            bar_boundary = find_nearest_boundary(i, frames_per_bar)
            proposed_index = None
            if abs(bar_boundary - i) <= frames_per_bar / 3:
                proposed_index = int(bar_boundary)
            else:
                # If we can't align to a bar, align to a beat
                beat_boundary = find_nearest_boundary(i, frames_per_beat)
                proposed_index = int(beat_boundary)
            
            if proposed_index < len(data):
                indices.append(proposed_index)

            cum_delta = 0  # Reset the cumulative delta
    return indices

snapped_division_indices = segment_array_to_music(complexity, target_complexity, fps, bpm, beats_per_bar)
cline = plot_complexity()
plot_complexity_target_lines()
plot_beat_snap_lines()
plot_segments(unsnapped_division_indices, color=cline.get_color(), label="Naïve divisions")
plot_segments(snapped_division_indices, label="Snapped divisions")

plt.title("Segmented based on complexity (Snap to bars & beats)")
plt.show()



#%%

# Create subgraph showing plot_complexity_by_bodypart in each available style
# import matplotlib.pyplot as plt
# import numpy as np

# plt.figure(figsize=(10, 20))

# for i, sty in enumerate(plt.style.available):
#     with plt.style.context(sty):
#         plt.subplot(7, 4, i+1)
#         plot_complexity_by_bodypart()
#         plt.xlabel(sty)
#         plt.ylabel("")
#         plt.gca().legend().remove()

# plt.tight_layout()