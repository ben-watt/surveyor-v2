import { generateClient } from "aws-amplify/data";
import { type Schema } from "@/amplify/data/resource";

const reportClient = generateClient<Schema>();

export default reportClient;