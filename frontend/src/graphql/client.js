import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Le token est lu à chaque requête : pas besoin de recréer le client au login/logout.
const httpLink = new HttpLink({
  uri: `${API}/graphql`,
  fetch: (uri, options) => {
    const token = localStorage.getItem("token");
    const headers = {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(uri, { ...options, headers });
  },
});

export const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});