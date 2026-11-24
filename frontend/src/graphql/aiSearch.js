import { gql } from "@apollo/client";

export const AI_SEARCH_QUERY = gql`
  query AiSearchFilters($query: String!) {
    aiSearchFilters(query: $query) {
      search
      city
      type
      domain
      explanation
    }
  }
`;