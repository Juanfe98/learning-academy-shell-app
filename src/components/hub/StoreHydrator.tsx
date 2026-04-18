"use client";

import { useEffect } from "react";
import { useProgressStore } from "@/lib/store";

export default function StoreHydrator() {
  useEffect(() => {
    useProgressStore.persist.rehydrate();
  }, []);

  return null;
}
