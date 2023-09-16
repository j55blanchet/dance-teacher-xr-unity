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

export async function getFeedback(
    performanceScore: number,
    performanceMaxScore: number
){
    
    const taskStatement = `
        ${Anthropic.HUMAN_PROMPT} You are an AI dance coach and you are giving feedback to a dancer, 
        who is learning a dance choreography from a dance video. 
        They have performed a part of the dance routine, and have received a score based on how well 
        they performed. 
        Please provide a short feedback message to the dancer based on their performance score, 
        including a recommendation of whether they should try again or not. 
        Your tone should be respectful and encouraging. 
        Information about the human and their performance will be provided in descriptive tags. 
        The feedback message should be no more than two sentances long and surrounded by 
        <feedbackmessage></feedbackmessage> tags. 
        The try again recommendation should be either 'yes' or 'no' and surrounded by 
        <tryagain></tryagain> tags.`;

    const example = `
    Here are two examples
    <example>
    H: <score>0.9</score> <maxscore>1</maxscore>
    A: <feedbackmessage>Great job! I think you're ready to move on.</feedbackmessage> 
    <tryagain>no</tryagain>
    </example>
    <example>
    H: <score>0.67</score> <maxscore>1</maxscore>
    A: <feedbackmessage>Still some room to improve. Keep up the persistance!</feedbackmessage> 
<tryagain>yes</tryagain>
    </example>
    `

    const dynamicData = `
    <score>${performanceScore}</score>
    <maxscore>${performanceMaxScore}</maxscore>
    `
    
    const prompt = `
        ${taskStatement}
        ${example}
        ${dynamicData}
        ${Anthropic.AI_PROMPT}
    `
    
    const params: Anthropic.CompletionCreateParamsNonStreaming = {
        prompt: prompt,
        model: 'claude-instant-1',
        max_tokens_to_sample: 300,
    }

    console.log(params);
    const completion: Anthropic.Completion = await anthropic.completions.create(params); 
    const claudeText = completion.completion;
    console.log(completion);
    const feedbackMessage = claudeText.match(/<feedbackmessage>(.*)<\/feedbackmessage>/)?.[1];
    const tryAgain = claudeText.match(/<tryagain>(.*)<\/tryagain>/)?.[1];


    if (tryAgain !== 'yes' && tryAgain !== 'no') {
        throw new Error(`Invalid try again value: ${tryAgain}`);
    }
    
    const tryAgainBoolean = tryAgain === 'yes' ? true : false;
    return { 
        rawText: claudeText, 
        feedbackMessage, 
        tryAgain: tryAgainBoolean
    };
}