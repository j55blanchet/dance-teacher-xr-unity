import { json, type RequestEvent } from "@sveltejs/kit";

import { getFeedback as getLLMFeedback } from "$lib/ai/backend/anthropic";

export async function POST(event: RequestEvent) {

    const data = await event.request.json();

    const danceStructureDistillation = data.danceStructureDistillation;
    const currentSectionName = data.currentSectionName;
    const performanceDistillation = data.performanceDistillation;
    
    if (!danceStructureDistillation || !currentSectionName || !performanceDistillation) {
        return json({
            error: "Missing required parameters " + JSON.stringify(data)
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