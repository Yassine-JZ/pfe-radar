import { gql, useApolloClient } from "@apollo/client";
import { useCallback, useState } from "react";

const ANALYSIS = gql`
  query Analysis($text: String, $skills: [String!]) {
    analysis(text: $text, skills: $skills) {
      skills {
        name
        domain
        core
      }
      domains {
        domain
        score
      }
    }
  }
`;

const CATALOG = gql`
  query Catalog {
    skillCatalog {
      name
      domain
      core
    }
  }
`;

export function useAnalysis() {
  const client = useApolloClient();
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [skills, setSkills] = useState([]);
  const [domains, setDomains] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [error, setError] = useState("");

  const fail = (err) => {
    setStatus("error");
    setError(err.message?.includes("Failed to fetch") ? "Impossible de joindre le serveur" : err.message);
  };

  const apply = (analysis) => {
    setSkills(analysis.skills);
    setDomains(analysis.domains);
  };

  const run = useCallback(
    async (text) => {
      setStatus("running");
      setError("");
      try {
        const [{ data }, cat] = await Promise.all([
          client.query({ query: ANALYSIS, variables: { text }, fetchPolicy: "network-only" }),
          client.query({ query: CATALOG }),
        ]);
        apply(data.analysis);
        setCatalog(cat.data.skillCatalog);
        setStatus("done");
      } catch (err) {
        fail(err);
      }
    },
    [client]
  );

  const updateSkills = useCallback(
    async (names) => {
      try {
        const { data } = await client.query({
          query: ANALYSIS,
          variables: { skills: names },
          fetchPolicy: "network-only",
        });
        apply(data.analysis);
      } catch (err) {
        fail(err);
      }
    },
    [client]
  );

  const addSkill = (name) => updateSkills([...skills.map((s) => s.name), name]);
  const removeSkill = (name) => updateSkills(skills.map((s) => s.name).filter((n) => n !== name));

  const reset = useCallback(() => {
    setStatus("idle");
    setSkills([]);
    setDomains([]);
    setError("");
  }, []);

  return { status, skills, domains, catalog, error, run, addSkill, removeSkill, reset };
}