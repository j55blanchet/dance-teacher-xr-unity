# %%
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# %%
csv_file = "data.csv"

# Read csv - first row is headers
df = pd.read_csv(csv_file, header=0)

# %%
dance_titles = [
    'bartender',
    'latchristmas',
    'madatdisney',
    'pajamaparty'
]

x_col = 'activity-step'
y_col = 'playbacks'

activity_steps = df[x_col].unique()
activity_steps.sort()

# Get 'Part 10-Part 10' to go after 'Part 9-Part 9'
# Part 10 is just after part 1 right now
p10 = activity_steps[1]
activity_steps = np.delete(activity_steps, 1)
activity_steps = np.insert(activity_steps, 9, p10)

#%%

# get series for each dance (ensure same x-axis ordering)
dance_series = {}
for dance in dance_titles:

    # create series for dance, with activitystep as the index
    playbacks_by_dance = df[df['dance'] == dance].set_index(x_col)[y_col]
    dance_series[dance] = playbacks_by_dance.reindex(activity_steps)

dance_series[dance_titles[0]]


#%%
# plot

x = np.arange(len(activity_steps))  # the label locations
width = 0.25  # the width of the bars
multiplier = 0

plt.figure(figsize=(20,10))

# plot grouped vertical bars
for dance in dance_titles:
    offset = multiplier * width
    rects = plt.bar(x + offset, dance_series[dance][activity_steps], width, label=dance)
    plt.bar_label(rects, padding=3)
    multiplier += 1
plt.xticks(x + width, activity_steps)

# plor
# for dance in dance_titles:
    # plt.plot(activity_steps, dance_series[dance][activity_steps], label=dance)


plt.ylabel('playbacks')
plt.xlabel('activity step')    
plt.title('Playbacks by activity step')
plt.xticks(rotation=-90)    
plt.legend()
fig1 = plt.gcf()

# %%
fig1.savefig('playbacks_by_activitystep.pdf')
fig1.show()
fig1

# %%
