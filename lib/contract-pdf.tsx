import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

// No "use client" — this only ever runs inside a Server Action
// (app/actions/contracts.ts), never rendered in the browser.

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#222222" },
  logo: { height: 40, marginBottom: 10, objectFit: "contain" },
  gymName: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  contactLine: { fontSize: 9, color: "#666666", marginBottom: 18 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#dddddd", marginBottom: 20 },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 },
  paragraph: { marginBottom: 12, lineHeight: 1.5 },
  footer: { marginTop: 44, flexDirection: "row", justifyContent: "space-between" },
  signatureBlock: { width: "45%" },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: "#222222", height: 30 },
  signatureLabel: { fontSize: 9, color: "#666666", marginTop: 4 },
  preparedDate: { fontSize: 8, color: "#999999", marginTop: 24 },
});

interface ContractDocumentProps {
  gymName: string;
  gymAddress: string | null;
  gymPhone: string | null;
  gymEmail: string | null;
  logoUrl: string | null;
  bodyText: string; // already token-rendered by lib/templates.ts
  memberName: string;
  date: string;
}

// "Gym Owner" is a deliberate static placeholder, not real data — there's
// no owner-name field in the schema yet. See the contract-PDF plan's
// judgment call 3.
export function ContractDocument({
  gymName,
  gymAddress,
  gymPhone,
  gymEmail,
  logoUrl,
  bodyText,
  memberName,
  date,
}: ContractDocumentProps) {
  const paragraphs = bodyText.split(/\n{2,}/);
  const contactLine = [gymAddress, gymPhone, gymEmail].filter(Boolean).join("  ·  ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {logoUrl ? <Image src={logoUrl} style={styles.logo} /> : <Text style={styles.gymName}>{gymName}</Text>}
        {logoUrl && <Text style={styles.gymName}>{gymName}</Text>}
        {contactLine && <Text style={styles.contactLine}>{contactLine}</Text>}

        <View style={styles.divider} />
        <Text style={styles.title}>Membership Agreement</Text>

        {paragraphs.map((paragraph, i) => (
          <Text key={i} style={styles.paragraph}>{paragraph}</Text>
        ))}

        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{memberName} — Member</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Gym Owner — {gymName}</Text>
          </View>
        </View>

        <Text style={styles.preparedDate}>Prepared {date}</Text>
      </Page>
    </Document>
  );
}

export async function renderContractPdf(props: ContractDocumentProps): Promise<Buffer> {
  return renderToBuffer(<ContractDocument {...props} />);
}
