import { gql } from "@apollo/client";

export const AI_MATCH_QUERY = gql`
  query AiMatchAnalysis($offerId: Int!, $profileId: Int!) {
    aiMatchAnalysis(offerId: $offerId, profileId: $profileId) {
      score
      covered
      missing
      summary
      plan {
        skill
        tip
      }
    }
  }
`;

export const AI_COVER_LETTER_QUERY = gql`
  query AiCoverLetter($offerId: Int!, $profileId: Int!, $notes: String) {
    aiCoverLetter(offerId: $offerId, profileId: $profileId, notes: $notes)
  }
`;