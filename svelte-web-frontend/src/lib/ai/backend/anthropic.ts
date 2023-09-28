/** anthropic.ts
 * 
 *  This file contains the code for the anthropic.ai API integration.
 *  Helpful links:
 *     > Prompt Design: https://docs.anthropic.com/claude/docs/introduction-to-prompt-design
 *     > Useful Hacks: https://docs.anthropic.com/claude/docs/let-claude-say-i-dont-know
 */
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';

const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
});

const taskStatement = `
${Anthropic.HUMAN_PROMPT} You are an AI dance coach and you are giving feedback to a dancer, who is learning a dance choreography from a dance video. 
They have performed a part of the dance routine, and the system has analyzed their performance and distilled it into a textual representation (surrounded by <performanceDistillation><performanceDistillation/> tags), along with other context (surrounded by <performanceDistillation><performanceDistillation/> tags) that you can use to provide coaching guidance.

Please generate the following pieces of feedback / guidance for the dancer:
1. Reflections on the distillations that the system has provided for you. What obsevations do you have about the data? What do you think the data means? What do you think the data implies about the dancer's performance, and what aspects of the performance cannot be determined from the data provided? This is space for you to reflect on the data and provide your own insights. It should be 1-4 paragraphs long and surrounded by <coachingreflection></coachingreflection> tags. If clear insights are not coming to you, you can also use this space to ask questions about the data, or to describe what you would like to know more about. This will be logged by the system and used to improve the experience, but will not be shown to the user.
2. A feedback message that describes how they did on their performance. It should be honest, but also encouraging and respectful, and as specific and constructive as possible. It should be no more than three sentances long and surrounded by <feedbackmessage></feedbackmessage> tags. You may refer to specific data points from the distillations if you think these would be helpful for the dance student, but there is no requirement to do so. Honesty is important - if you do not have specific feedback to give that is firmly grounded in the data, you should not make something up. Simply communicate that you do not have any specific feedback to give at this time. This will be shown to the user.
3. A recommendation on which section they should practice next, in the form of a specific section ID / subsection ID that was mentioned in the distillation. This should be surrounded by <nextsection></nextsection> tags. This will be decoded by the system and used in the user interface to highlight the recommended section. If you do not have a specific recommendation, you can use the string 'null' to indicate that you do not have a recommendation.
4. A coaching message that communicates the section you have recommended to the user and provides guidance, suggestions, or encouragement to the student. It can be anywhere from 1-2 sentances long and should be surrounded by <coachingmessage></coachingmessage> tags. This will be shown to the user. If you did not have a specific section recommendation, then you can focus on providing general guidance to the student in this message.
5. A short title that summarizes the feedback you have given. This should be no more than 6 words long and surrounded by <feedbacktitle></feedbacktitle> tags. It can be as simple as "Good job!" or as complex as "Let's practice this some more". This will be shown to the user.

In the user-visible feedback, you should refrain from going into excessive detail about the mechanics of how the feedback is being generated (). Instead, you should pretend that YOU, as an AI dance coach, have made these observations, thereby mimicing the experience of learning from a human dance coach.

You should treat the student as a peer, and you should not use language that is overly formal or technical.
`

const example = '';

export async function getFeedback(
    danceStructureDistillation: string,
    currentSectionName: string,
    performanceDistillation: string,

){
    
    const dynamicData = `
<danceStructureDistillation>${danceStructureDistillation}</danceStructureDistillation>
<currentSectionName>${currentSectionName}</currentSectionName>
<performanceDistillation>${performanceDistillation}</performanceDistillation>
`
    
    const prompt = taskStatement + example + dynamicData + Anthropic.AI_PROMPT;
    
    const params: Anthropic.CompletionCreateParamsNonStreaming = {
        prompt: prompt,
        model: 'claude-instant-1',
        max_tokens_to_sample: 4000,
    }

    console.log(params);
    const completion: Anthropic.Completion = await anthropic.completions.create(params); 
    const claudeText = completion.completion;
    console.log('Stop Reason', completion.stop_reason);
    console.log('Claude Text')
    console.log(completion.completion);
    console.log('\nLooking for tags...')

    const coachingReflection = claudeText.match(/<coachingreflection>([\s\S]*?)<\/coachingreflection>/)?.[1];

    const feedbackMessage = claudeText.match(/<feedbackmessage>([\s\S]*?)<\/feedbackmessage>/)?.[1];
    const nextSection = claudeText.match(/<nextsection>([\s\S]*?)<\/nextsection>/)?.[1];
    const coachingMessage = claudeText.match(/<coachingmessage>([\s\S]*?)<\/coachingmessage>/)?.[1];
    const feedbackTitle = claudeText.match(/<feedbacktitle>([\s\S]*?)<\/feedbacktitle>/)?.[1];

    if (!coachingReflection) {
        throw new Error(`Invalid Claude Text (missing expected xml for <coachingreflection>): ${claudeText}`);
    }
    if (!feedbackMessage) {
        throw new Error(`Invalid Claude Text (missing expected xml for <feedbackmessage>): ${claudeText}`);
    }
    if (!nextSection) {
        throw new Error(`Invalid Claude Text (missing expected xml for <nextsection>): ${claudeText}`);
    }
    if (!coachingMessage) {
        throw new Error(`Invalid Claude Text (missing expected xml for <coachingmessage>): ${claudeText}`);
    }
    if (!feedbackTitle) {
        throw new Error(`Invalid Claude Text (missing expected xml for <feedbacktitle>): ${claudeText}`);
    }
    
    return {        
        coachingReflection,
        feedbackMessage, 
        nextSection,
        coachingMessage,
        feedbackTitle,
    };
}