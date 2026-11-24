import { gql } from "@apollo/client";

export const SAVED_PROFILES_QUERY = gql`
  query SavedProfiles {
    savedProfiles {
      id
      name
      skills
      createdAt
      domains {
        domain
        score
      }
      topOffers {
        offerId
        title
        company
        city
        score
        missing
      }
    }
  }
`;

export const SAVE_PROFILE_MUTATION = gql`
  mutation SaveProfile($name: String!, $skills: [String!]!) {
    saveProfile(name: $name, skills: $skills) {
      id
      name
      skills
      createdAt
    }
  }
`;

export const DELETE_PROFILE_MUTATION = gql`
  mutation DeleteSavedProfile($id: Int!) {
    deleteSavedProfile(id: $id)
  }
`;