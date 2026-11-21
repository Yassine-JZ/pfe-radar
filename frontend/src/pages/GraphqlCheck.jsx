import { gql, useQuery } from "@apollo/client";

const CHECK = gql`
  query Check {
    ping
    me {
      id
      fullName
      email
    }
  }
`;

export default function GraphqlCheck() {
  const { data, loading, error } = useQuery(CHECK);
  if (loading) return <p className="center">Chargement…</p>;
  if (error) return <p className="center error">{error.message}</p>;
  return (
    <main className="auth">
      <div className="card">
        <h1>Test GraphQL</h1>
        <p>ping : {data.ping}</p>
        <p>
          Connecté :{" "}
          {data.me ? `${data.me.fullName} (${data.me.email})` : "non"}
        </p>
      </div>
    </main>
  );
}