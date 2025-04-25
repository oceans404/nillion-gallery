// Check if environment variables are available
const NILLION_SECRET_KEY = process.env.NILLION_SECRET_KEY || ""
const NILLION_ORG_DID = process.env.NILLION_ORG_DID || ""

// Log warning if environment variables are missing
if (!NILLION_SECRET_KEY || !NILLION_ORG_DID) {
  console.warn("Warning: Nillion environment variables are missing or empty")
}

export const orgConfig = {
  orgCredentials: {
    secretKey: NILLION_SECRET_KEY,
    orgDid: NILLION_ORG_DID,
  },
  nodes: [
    {
      url: "https://nildb-nx8v.nillion.network",
      did: "did:nil:testnet:nillion1qfrl8nje3nvwh6cryj63mz2y6gsdptvn07nx8v",
    },
    {
      url: "https://nildb-p3mx.nillion.network",
      did: "did:nil:testnet:nillion1uak7fgsp69kzfhdd6lfqv69fnzh3lprg2mp3mx",
    },
    {
      url: "https://nildb-rugk.nillion.network",
      did: "did:nil:testnet:nillion1kfremrp2mryxrynx66etjl8s7wazxc3rssrugk",
    },
  ],
}

// This is the schema ID that's causing the permission error
// We'll keep it for reference but provide a fallback mechanism
export const SCHEMA_ID = "1600a05d-2e91-4128-a2e4-063fec8eb169"

// Add a function to validate the Nillion configuration
export function isNillionConfigValid(): boolean {
  return Boolean(NILLION_SECRET_KEY && NILLION_ORG_DID)
}

// Add a function to check if the schema ID is valid
export function validateSchemaId(schemaId: string): boolean {
  // Check if the schema ID is in the correct format (UUID v4)
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidV4Regex.test(schemaId)
}
