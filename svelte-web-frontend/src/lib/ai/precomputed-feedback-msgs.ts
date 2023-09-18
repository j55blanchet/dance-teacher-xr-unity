// Headlines for feedback when the user danced well
const GoodTrialHeadlines = Object.freeze([
    "Nice Job!",
    "Great Moves!",
    "You're Killing It!",
    "Awesome Dancing!",
    "Keep It Up!",
    "Incredible Rhythm!",
    "Impressive Dancing!",
    "Amazing Performance!",
    "You've Got the Groove!",
    "You're a Dancing Machine!",
    "Phenomenal Footwork!",
    "You're a Star!",
    "Excellent Execution!",
    "You're on Fire!",
    "Superb Dancing!",
    "You're a Pro!",
    "Outstanding Performance!"
])
export function getRandomGoodTrialHeadline() {
    return GoodTrialHeadlines[Math.floor(Math.random() * GoodTrialHeadlines.length)]
}

// Headlines for feedback when the user didn't do particularly well (and should try again).
const BadTrialHeadline = Object.freeze([
    "Don't Give Up!",
    "Keep Pushing!",
    "You've Got This!",
    "Stay Strong!",
    "Keep Going!",
    "Believe In Yourself!",
    "Stay Focused!",
    "Never Give Up!",
    "You Can Do It!",
    "Stay Motivated!",
    "Keep Moving Forward!",
    "Stay Resilient!",
    "Stay Positive!",
    "Stay Determined!",
    "Stay Committed!",
    "Stay Persistent!",
    "Stay Confident!",
    "Stay Inspired!",
    "Stay Driven!",
    "Stay Tenacious!"
])

export function getRandomBadTrialHeadline() {
    return BadTrialHeadline[Math.floor(Math.random() * BadTrialHeadline.length)]
}