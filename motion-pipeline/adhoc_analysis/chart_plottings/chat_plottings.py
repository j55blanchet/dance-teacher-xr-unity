
# %%
import matplotlib.pyplot as plt
import pandas as pd

evaluation_question_labels = [
    'Overall intuitiveness of the UI',
    'How the dance is divided into sections',
    'Structure of the Learning Journey',
    'Color-coded Skeleton (Concurrent)',
    '"Accuracy score" (Terminal)',
    'AI Generated Text Feedback (Terminal)',
]

evaluation_scores = [4.6, 4.8, 4.2, 3.6, 3.6, 2.4]

# make bar chart
moco_df = pd.DataFrame({'Questions': evaluation_question_labels, 'scores': evaluation_scores})



# %%


ax = moco_df.plot.barh(x='Questions', y='scores', rot=0, figsize=(3.33, 2), legend=False)
# hide y axis title
ax.set_ylabel('')

plt.savefig('moco_evaluation.pdf', bbox_inches='tight')


# %%

pilot_study_qs = [
    'Overall intuitiveness of the UI',
    'How the dance is divided into sections',
    '"Accuracy score" (Terminal)',
    'AI Generated Text Feedback (Terminal)',
    'AI Generated Practice Suggestions (Terminal)',
]
pilot_study_scores = [3, 4.5, 3 + 1/3, 3 + 2/3, 3 + 1/6]

pilot_df = pd.DataFrame({'Questions': pilot_study_qs, 'scores': pilot_study_scores})

ax = pilot_df.plot.barh(x='Questions', y='scores', rot=0, figsize=(3.33, 2), legend=False)
# hide y axis title
ax.set_ylabel('')
plt.savefig('pilot_study_evaluation.pdf', bbox_inches='tight')

# %%
