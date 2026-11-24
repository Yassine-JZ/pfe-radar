import { gql } from "@apollo/client";

export const SAVED_OFFER_IDS_QUERY = gql`
  query SavedOfferIds {
    savedOfferIds
  }
`;

export const SAVED_OFFERS_QUERY = gql`
  query SavedOffers {
    savedOffers {
      id
      title
      company
      city
      domain
      type
      skills
      applyUrl
      deadline
    }
  }
`;

export const TOGGLE_SAVE_OFFER_MUTATION = gql`
  mutation ToggleSaveOffer($offerId: Int!) {
    toggleSaveOffer(offerId: $offerId)
  }
`;