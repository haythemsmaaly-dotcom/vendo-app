import React from "react";
import LegalScreen from "@/src/components/LegalScreen";
import { PRIVACY } from "@/src/legal";

export default function Privacy() {
  return <LegalScreen doc={PRIVACY} header="Privacy" />;
}
