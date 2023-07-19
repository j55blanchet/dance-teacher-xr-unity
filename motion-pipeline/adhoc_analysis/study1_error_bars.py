# %%
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

data = pd.read_csv("study1_updated.csv")
data = data.set_index('condition')

cols = 'condition', 'emmean', 'SE'
df = data

gray = '#D3D3D3'
green = '#64C84D'
blue = '#95CDE8'

# %%
pltwidth = 3 + 1/3
plt_aspect = 16 / 9
pltheight = pltwidth / plt_aspect
fig, ax = plt.subplots(
    figsize=(pltwidth, pltheight)
)

# set font size to 9
plt.rcParams.update({'font.size': 9})

ax.bar(
    range(len(df)), 
    df["emmean"], 
    label=df.index,
    # yerr=df["SE"],
    bottom=0,
    color=[gray, green, blue],
)
ax.set_ylim(2.5, 4.2)

# remove x ticks
ax.tick_params(axis='x', which='both', bottom=False, top=False, labelbottom=False)

ax.legend(loc ="upper center",
          bbox_to_anchor=(0, 0, 1, -.05),
)

# set error bar cap size (1 stroke width)
ax.errorbar(
    x=range(len(df)),
    y=df["emmean"],
    yerr=df["SE"],
    fmt='none',
    capsize=5,
    ecolor='black',
    elinewidth=1,

)

# show data labels above error bars

for i, v in enumerate(df["emmean"]):

    # err = df["SE"][i]
    ax.text(
        i, 
        v + 0.12, 
        f"{v:.2f}", 
        ha='center', 
        va='bottom',
        color='black',
    )



# %%
# save figure to pdf
fig.savefig(
    "study1_error_bars.pdf",
    bbox_inches='tight',
)
# %%
