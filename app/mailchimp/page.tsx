import mailchimp from "@mailchimp/mailchimp_marketing";

interface MailchimpAccount {
  title: string;
  apiKey: string;
  server: string;
  listId: string;
}

async function fetchMailchimpStats(account: MailchimpAccount) {
  mailchimp.setConfig({
    apiKey: account.apiKey,
    server: account.server,
  });

  try {
    const response = await mailchimp.lists.getList(account.listId);

    // ✅ Include cleaned contacts count explicitly
    const cleanedCount = response.stats?.cleaned_members ?? 0;

    // Return everything you need
    return {
      ...response.stats,
      title: account.title,
      cleanedCount, // new field for table
    };
  } catch (error) {
    return { error: true, title: account.title, cleanedCount: 0 };
  }
}


// Helper to format numbers with commas
function formatNumber(num?: number) {
  return typeof num === "number" ? num.toLocaleString() : "0";
}

export default async function MailchimpStatsPage() {
  // Parse accounts JSON from .env
  const accountsJson = process.env.MAILCHIMP_ACCOUNTS_JSON || "{}";
  const parsedAccounts = JSON.parse(accountsJson);

  // Convert to array of MailchimpAccount
  const accounts: MailchimpAccount[] = Object.entries(parsedAccounts).map(
    ([title, data]: [string, any]) => ({
      title,
      apiKey: data.apiKey,
      server: data.server,
      listId: data.listId,
    })
  );

  // Sequential fetch
  const statsArray: any[] = [];
  for (const account of accounts) {
    const stats = await fetchMailchimpStats(account);
    statsArray.push(stats);
  }

  // 🔽 SORT: highest subscribers first, errors last
  statsArray.sort((a, b) => {
    if (a.error) return 1;
    if (b.error) return -1;
    return (b.member_count ?? 0) - (a.member_count ?? 0);
  });



  return (
    <main style={styles.body}>
      <h1>Mailchimp Audience Stats</h1>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Title</th>
            <th style={styles.th}>Email Subscribers</th>
            <th style={styles.th}>Unsubscribed</th>
            <th style={styles.th}>Cleaned Emails</th>
          </tr>
        </thead>
        <tbody>
          {statsArray.map((stats, idx) => (
            <tr key={idx}>
              <td style={styles.td}>{stats.title}</td>
              <td style={styles.td}>
                {stats.error ? "Error fetching data" : formatNumber(stats.member_count)}
              </td>
              <td style={styles.td}>
                {stats.error ? "Error fetching data" : formatNumber(stats.unsubscribe_count)}
              </td>
              <td style={styles.td}>
                {stats.error ? "Error fetching data" : formatNumber(stats.cleaned_count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    fontFamily: "Arial, sans-serif",
    background: "#ffffff",
    padding: "40px",
    minHeight: "100vh",
    color: "#000000",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  th: {
    textAlign: "left",
    borderBottom: "2px solid #000",
    padding: "8px",
    fontSize: "18px",
  },
  td: {
    borderBottom: "1px solid #ddd",
    padding: "8px",
    fontSize: "16px",
  },
};
