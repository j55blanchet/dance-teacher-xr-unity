import { browser } from "$app/environment";

export type StepProgressData = {
    completed: boolean;
}
export type ActivityProgress = {
    [step_id: string]: StepProgressData;
}
export type TreeProgress = {
    [activity_id: string]: ActivityProgress;
}

export function get_tree_progress(
    dance_id: string,
    tree_name: string,
): TreeProgress {
    if (!browser) {
        return {};
    }

    const tree_progress_string = localStorage.getItem(`progress_${dance_id}_${tree_name}`);
    
    let localstorage_data = null;
    try {
        if (tree_progress_string !== null) {
            localstorage_data = JSON.parse(tree_progress_string);
        }
        // check to ensure localstorage_data is an object
        if (typeof localstorage_data !== 'object') {
            localstorage_data = null;
        }
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Invalid progress data in localstorage', error.message);
        }
    }
    const progress_data = localstorage_data || {};

    return progress_data
}

export function save_activitystep_progress(
   dance_id: string,
   tree_name: string,
   activity_id: string,
   step_id: string,
   progressData: StepProgressData,
): TreeProgress {
    if (!browser) {
        return {};
    }

    const tree_progress_data = get_tree_progress(dance_id, tree_name);
    const activity_data = tree_progress_data[activity_id] || {};
    activity_data[step_id] = progressData;
    tree_progress_data[activity_id] = activity_data;

    localStorage.setItem(`progress_${dance_id}_${tree_name}`, JSON.stringify(tree_progress_data));

    return tree_progress_data;
}