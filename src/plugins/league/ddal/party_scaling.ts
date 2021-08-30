/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line no-shadow
export enum PartyScaling {
    'Very Weak' = 0,
    'Weak',
    'Average',
    'Strong',
    'Very Strong'
}
export const PartyScalingLength = PartyScaling['Very Strong'] + 1;
