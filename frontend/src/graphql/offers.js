import { gql } from "@apollo/client";

export const OFFERS_QUERY = gql`
  query Offers(
    $search: String
    $city: String
    $type: String
    $domain: String
    $page: Int!
    $pageSize: Int!
  ) {
    offers(
      search: $search
      city: $city
      type: $type
      domain: $domain
      page: $page
      pageSize: $pageSize
    ) {
      total
      page
      pageSize
      totalPages
      items {
        id
        title
        company
        city
        type
        domain
        skills
        applyUrl
        publishedAt
        deadline
      }
    }
  }
`;

export const CITIES_QUERY = gql`
  query Cities {
    cities {
      name
    }
  }
`;