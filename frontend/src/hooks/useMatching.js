import { gql, useApolloClient } from "@apollo/client";
import { useCallback, useRef, useState } from "react";

const MATCHES = gql`
  query Matches($skills: [String!]!, $limit: Int) {
    matches(skills: $skills, limit: $limit) {
      total
      strong
      needsMore
      offers {
        id
        title
        company
        city
        domain
        type
        latitude
        longitude
        score
        covered
        missing
        applyUrl
        deadline
        source
      }
    }
  }
`;

export function useMatching() {
  const client = useApolloClient();
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const lastRequest = useRef(0);

  // `skills` : liste de noms. Si l'utilisateur modifie ses compétences pendant
  // qu'une requête tourne, on ignore la réponse devenue périmée.
  const run = useCallback(
    async (skills) => {
      const request = ++lastRequest.current;
      setStatus("running");
      setError("");
      try {
        const { data } = await client.query({
          query: MATCHES,
          variables: { skills, limit: 6 },
          fetchPolicy: "network-only",
        });
        if (request !== lastRequest.current) return;
        setResult(data.matches);
        setStatus("done");
      } catch (err) {
        if (request !== lastRequest.current) return;
        setStatus("error");
        setError(
          err.message?.includes("Failed to fetch")
            ? "Impossible de joindre le serveur"
            : err.message
        );
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    lastRequest.current++;
    setStatus("idle");
    setResult(null);
    setError("");
  }, []);

  return { status, result, error, run, reset };
}
