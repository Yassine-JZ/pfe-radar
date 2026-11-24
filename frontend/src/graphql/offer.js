import { gql } from "@apollo/client";

export const OFFER_QUERY = gql`
  query Offer($id: Int!) {
    offer(id: $id) {
      id
      title
      company
      city
      type
      domain
      description
      skills
      applyUrl
      publishedAt
      deadline
    }
  }
`;