import { json, type RequestEvent } from "@sveltejs/kit";

import { getFeedback as getLLMFeedback } from "$lib/ai/backend/anthropic";

export async function POST(event: RequestEvent) {

    const data = await event.request.json();

    const danceStructureDistillation = data.danceStructureDistillation;
    const currentSectionName = data.currentSectionName;
    const performanceDistillation = data.performanceDistillation;
    
    if (!danceStructureDistillation || !currentSectionName || !performanceDistillation) {
        const missingParameters = [
            danceStructureDistillation ? undefined : 'danceStructureDistillation', 
            currentSectionName ? undefined : 'currentSectionName', 
            performanceDistillation ? undefined : 'performanceDistillation'
        ].filter((x) => x !== undefined);

        return json({
            error: "Missing required parameters: " + missingParameters.join(', ')
        },  {
            status: 400
        });
    }

    const feedbackData = await getLLMFeedback(
        danceStructureDistillation,
        currentSectionName,
        performanceDistillation,
    );

    return json(feedbackData);
}