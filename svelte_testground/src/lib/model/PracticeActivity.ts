export default interface PracticeActivity {
    startTime: number;
    endTime: number;
    activityTypes: Array<'watch' | 'mark' | 'drill' | 'fullout'>;
    playbackSpeed: number;
};