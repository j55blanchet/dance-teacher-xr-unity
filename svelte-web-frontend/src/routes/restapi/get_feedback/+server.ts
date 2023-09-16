import { json, type RequestEvent } from "@sveltejs/kit";

import { getFeedback as getLLMFeedback } from "$lib/ai/llm/anthropic";

export async function POST(event: RequestEvent) {

    const data = await event.request.json();

    const performanceScore = data.performanceScore;
    const performanceMaxScore = data.performanceMaxScore;

    if (!performanceScore || !performanceMaxScore) {
        return json({
            error: "Missing required parameters " + JSON.stringify(data)
        },  {
            status: 400
        });
    }

    const feedbackData = await getLLMFeedback(
        performanceScore,
        performanceMaxScore
    );

    return json(feedbackData);
}