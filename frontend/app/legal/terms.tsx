import React from "react";
import LegalScreen from "@/src/components/LegalScreen";
import { TERMS } from "@/src/legal";

export default function Terms() {
  return <LegalScreen doc={TERMS} header="Terms" />;
}
