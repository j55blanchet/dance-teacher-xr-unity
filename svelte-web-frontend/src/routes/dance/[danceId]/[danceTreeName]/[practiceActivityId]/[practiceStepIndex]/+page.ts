import { error } from '@sveltejs/kit';

import { getDanceTreeFromDanceAndTreeName } from '$lib/data/dances-store.js';
import type { PracticePlan, PracticePlanActivity } from '$lib/model/PracticePlan';
import type PracticeStep from '$lib/model/PracticeStep.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params, parent })  {

    const { practiceActivity } = await parent();
    // let practiceActivity: PracticePlanActivity;

    const matchingPracticeStep: PracticeStep | undefined = practiceActivity.steps[+params.practiceStepIndex];

    if (!matchingPracticeStep) {
        throw error(404, 'Practice Step Not found');
    }
    
    return {
        // dance: dance,
        // danceTree,
        // practicePlan,
        // practiceActivity: matchingActivity,
        practiceStep: matchingPracticeStep,
        practiceStepIndex: +params.practiceStepIndex,
        // preselectedNodeId: preselectedNodeId,
    }
}

export const prerender = false;
export const trailingSlash = 'always'; // include trailing slash so that relative links work