import { generateClient } from "aws-amplify/data"
import { type Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

export default client;