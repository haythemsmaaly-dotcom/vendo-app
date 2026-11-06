import React from "react";
import LegalScreen from "@/src/components/LegalScreen";
import { DELETE_ACCOUNT } from "@/src/legal";

export default function DeleteAccountInfo() {
  return <LegalScreen doc={DELETE_ACCOUNT} header="Account deletion" />;
}
