// Explicit, documented weighting: a comment counts most, then a save, then a
// like, then raw traffic. See docs/solution-social.md and CriteriosStory.
export const solutionScore=(likes:number,saves:number,comments:number,views:number)=>
 likes+saves*2+comments*3+views*0.1;
